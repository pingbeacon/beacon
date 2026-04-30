<?php

use App\Http\Controllers\FiredTodayDeliveriesController;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Http\Request;

it('returns per-channel fired-today counts scoped to the current team', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $teamId]);

    $a = NotificationChannel::factory()->for($user)->create(['team_id' => $teamId]);
    $b = NotificationChannel::factory()->for($user)->create(['team_id' => $teamId]);

    NotificationDelivery::factory()->count(3)->create([
        'team_id' => $teamId,
        'channel_id' => $a->id,
        'monitor_id' => $monitor->id,
        'dispatched_at' => now(),
    ]);
    NotificationDelivery::factory()->create([
        'team_id' => $teamId,
        'channel_id' => $b->id,
        'monitor_id' => $monitor->id,
        'dispatched_at' => now()->subMinutes(10),
    ]);

    NotificationDelivery::factory()->create([
        'team_id' => $teamId,
        'channel_id' => $a->id,
        'monitor_id' => $monitor->id,
        'dispatched_at' => now()->subDay()->subMinutes(5),
    ]);

    $response = $this->actingAs($user)->getJson(route('notification-deliveries.fired-today'));

    $response->assertOk();

    $payload = collect($response->json())->keyBy('channel_id');

    expect((int) $payload[$a->id]['count'])->toBe(3);
    expect((int) $payload[$b->id]['count'])->toBe(1);
});

it('returns an empty array when current_team_id is null (controller-level guard)', function () {
    $user = User::factory()->create();
    $user->forceFill(['current_team_id' => null])->save();

    $request = Request::create('/monitors/notification-deliveries/fired-today', 'GET');
    $request->setUserResolver(fn () => $user);

    $response = (new FiredTodayDeliveriesController)($request);

    expect($response->getStatusCode())->toBe(200);
    expect($response->getData(true))->toBe([]);
});

it('does not leak deliveries from another team', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $ownerMonitor = Monitor::factory()->for($owner)->create([
        'team_id' => $owner->current_team_id,
    ]);
    $otherMonitor = Monitor::factory()->for($other)->create([
        'team_id' => $other->current_team_id,
    ]);

    $ownerChannel = NotificationChannel::factory()->for($owner)->create([
        'team_id' => $owner->current_team_id,
    ]);
    $otherChannel = NotificationChannel::factory()->for($other)->create([
        'team_id' => $other->current_team_id,
    ]);

    NotificationDelivery::factory()->create([
        'team_id' => $owner->current_team_id,
        'channel_id' => $ownerChannel->id,
        'monitor_id' => $ownerMonitor->id,
        'dispatched_at' => now(),
    ]);
    NotificationDelivery::factory()->count(5)->create([
        'team_id' => $other->current_team_id,
        'channel_id' => $otherChannel->id,
        'monitor_id' => $otherMonitor->id,
        'dispatched_at' => now(),
    ]);

    $response = $this->actingAs($owner)->getJson(route('notification-deliveries.fired-today'));

    $response->assertOk();

    $rows = $response->json();

    expect($rows)->toHaveCount(1);
    expect((int) $rows[0]['channel_id'])->toBe($ownerChannel->id);
    expect((int) $rows[0]['count'])->toBe(1);
});
