<?php

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;

it('returns the monitor delivery log paginated, newest first', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    foreach (range(1, 25) as $i) {
        NotificationDelivery::factory()->create([
            'team_id' => $user->current_team_id,
            'channel_id' => $channel->id,
            'monitor_id' => $monitor->id,
            'dispatched_at' => now()->subMinutes($i),
            'status' => 'delivered',
        ]);
    }

    $response = $this->actingAs($user)->getJson(
        route('monitors.notification-deliveries.index', $monitor),
    );

    $response->assertOk();

    $body = $response->json();
    expect($body['data'])->toHaveCount(20);
    expect($body['meta']['total'])->toBe(25);

    $first = $body['data'][0]['dispatched_at'];
    $second = $body['data'][1]['dispatched_at'];
    expect(strtotime($first))->toBeGreaterThanOrEqual(strtotime($second));
});

it('filters the delivery log by status', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    NotificationDelivery::factory()->count(3)->create([
        'team_id' => $user->current_team_id,
        'channel_id' => $channel->id,
        'monitor_id' => $monitor->id,
        'status' => 'delivered',
    ]);
    NotificationDelivery::factory()->count(2)->create([
        'team_id' => $user->current_team_id,
        'channel_id' => $channel->id,
        'monitor_id' => $monitor->id,
        'status' => 'failed',
        'error' => 'boom',
    ]);

    $delivered = $this->actingAs($user)->getJson(
        route('monitors.notification-deliveries.index', [$monitor, 'status' => 'delivered']),
    );
    expect($delivered->json('meta.total'))->toBe(3);

    $failed = $this->actingAs($user)->getJson(
        route('monitors.notification-deliveries.index', [$monitor, 'status' => 'failed']),
    );
    expect($failed->json('meta.total'))->toBe(2);

    $all = $this->actingAs($user)->getJson(
        route('monitors.notification-deliveries.index', [$monitor, 'status' => 'all']),
    );
    expect($all->json('meta.total'))->toBe(5);
});

it('does not leak deliveries from another monitor or another team', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $monitor = Monitor::factory()->for($owner)->create([
        'team_id' => $owner->current_team_id,
    ]);
    $siblingMonitor = Monitor::factory()->for($owner)->create([
        'team_id' => $owner->current_team_id,
    ]);
    $foreignMonitor = Monitor::factory()->for($other)->create([
        'team_id' => $other->current_team_id,
    ]);

    $channel = NotificationChannel::factory()->for($owner)->create([
        'team_id' => $owner->current_team_id,
    ]);

    NotificationDelivery::factory()->count(2)->create([
        'team_id' => $owner->current_team_id,
        'channel_id' => $channel->id,
        'monitor_id' => $monitor->id,
    ]);
    NotificationDelivery::factory()->create([
        'team_id' => $owner->current_team_id,
        'channel_id' => $channel->id,
        'monitor_id' => $siblingMonitor->id,
    ]);
    NotificationDelivery::factory()->create([
        'team_id' => $other->current_team_id,
        'channel_id' => $channel->id,
        'monitor_id' => $foreignMonitor->id,
    ]);

    $response = $this->actingAs($owner)->getJson(
        route('monitors.notification-deliveries.index', $monitor),
    );

    expect($response->json('meta.total'))->toBe(2);

    $foreign = $this->actingAs($owner)->getJson(
        route('monitors.notification-deliveries.index', $foreignMonitor),
    );
    $foreign->assertForbidden();
});
