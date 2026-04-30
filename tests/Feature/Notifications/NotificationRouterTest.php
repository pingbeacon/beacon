<?php

use App\DTOs\NotificationEvent;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationRoute;
use App\Models\Team;
use App\Models\User;
use App\Services\NotificationRouter;

function makeMonitorWithTeam(): Monitor
{
    $user = User::factory()->create();

    return Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);
}

function makeChannelForMonitor(Monitor $monitor, array $overrides = []): NotificationChannel
{
    return NotificationChannel::factory()->create(array_merge([
        'user_id' => $monitor->user_id,
        'team_id' => $monitor->team_id,
    ], $overrides));
}

function downStatusEvent(Monitor $monitor, ?string $severity = null): NotificationEvent
{
    return new NotificationEvent(
        monitor: $monitor,
        type: 'status_flip',
        newStatus: 'down',
        previousStatus: 'up',
        severity: $severity,
    );
}

it('returns empty when no routes and no pivot channels', function () {
    $monitor = makeMonitorWithTeam();

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels)->toHaveCount(0);
});

it('falls back to pivot channels when no routes exist', function () {
    $monitor = makeMonitorWithTeam();
    $channel = makeChannelForMonitor($monitor);
    $monitor->notificationChannels()->attach($channel);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels)->toHaveCount(1)
        ->and($channels->first()->id)->toBe($channel->id);
});

it('uses monitor-scoped routes when present', function () {
    $monitor = makeMonitorWithTeam();
    $pivotChannel = makeChannelForMonitor($monitor);
    $monitor->notificationChannels()->attach($pivotChannel);

    $routedChannel = makeChannelForMonitor($monitor);
    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$routedChannel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels->pluck('id')->all())->toBe([$routedChannel->id]);
});

it('uses team-scoped routes when no monitor route exists', function () {
    $monitor = makeMonitorWithTeam();
    $channel = makeChannelForMonitor($monitor);

    NotificationRoute::factory()->create([
        'monitor_id' => null,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$channel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels->pluck('id')->all())->toBe([$channel->id]);
});

it('filters by severity_filter', function () {
    $monitor = makeMonitorWithTeam();
    $criticalChannel = makeChannelForMonitor($monitor);
    $warningChannel = makeChannelForMonitor($monitor);

    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'priority' => 10,
        'conditions' => ['severity_filter' => ['critical'], 'status_filter' => null],
        'channel_ids' => [$criticalChannel->id],
    ]);
    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'priority' => 20,
        'conditions' => ['severity_filter' => ['warning'], 'status_filter' => null],
        'channel_ids' => [$warningChannel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor, 'critical'));

    expect($channels->pluck('id')->all())->toBe([$criticalChannel->id]);
});

it('filters by status_filter', function () {
    $monitor = makeMonitorWithTeam();
    $downChannel = makeChannelForMonitor($monitor);
    $upChannel = makeChannelForMonitor($monitor);

    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'priority' => 10,
        'conditions' => ['severity_filter' => null, 'status_filter' => ['down']],
        'channel_ids' => [$downChannel->id],
    ]);
    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'priority' => 20,
        'conditions' => ['severity_filter' => null, 'status_filter' => ['up']],
        'channel_ids' => [$upChannel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels->pluck('id')->all())->toBe([$downChannel->id]);
});

it('orders rules by priority ASC and dedupes channels first-match-wins', function () {
    $monitor = makeMonitorWithTeam();
    $shared = makeChannelForMonitor($monitor);
    $extra = makeChannelForMonitor($monitor);

    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'priority' => 50,
        'channel_ids' => [$extra->id, $shared->id],
    ]);
    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'priority' => 10,
        'channel_ids' => [$shared->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels->pluck('id')->all())->toBe([$shared->id, $extra->id]);
});

it('ignores inactive routes', function () {
    $monitor = makeMonitorWithTeam();
    $channel = makeChannelForMonitor($monitor);
    NotificationRoute::factory()->inactive()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$channel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels)->toHaveCount(0);
});

it('filters out disabled channels', function () {
    $monitor = makeMonitorWithTeam();
    $channel = makeChannelForMonitor($monitor, ['is_enabled' => false]);
    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$channel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels)->toHaveCount(0);
});

it('rejects channels from a different team', function () {
    $monitor = makeMonitorWithTeam();
    $otherUser = User::factory()->create();
    $otherTeam = Team::find($otherUser->current_team_id);
    $foreignChannel = NotificationChannel::factory()->create([
        'user_id' => $otherUser->id,
        'team_id' => $otherTeam->id,
    ]);

    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$foreignChannel->id],
    ]);

    $channels = (new NotificationRouter)->route(downStatusEvent($monitor));

    expect($channels)->toHaveCount(0);
});
