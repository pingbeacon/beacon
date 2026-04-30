<?php

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationRoute;
use App\Models\User;

it('stores a routing rule for the monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    $this->actingAs($user)
        ->post(route('monitors.notification-routes.store', $monitor), [
            'name' => 'critical-only',
            'priority' => 10,
            'is_active' => true,
            'conditions' => ['severity_filter' => ['critical'], 'status_filter' => ['down']],
            'channel_ids' => [$channel->id],
        ])
        ->assertRedirect();

    expect(NotificationRoute::query()->where('monitor_id', $monitor->id)->count())->toBe(1);
});

it('rejects channels from a different team', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $foreignChannel = NotificationChannel::factory()->for($other)->create([
        'team_id' => $other->current_team_id,
    ]);

    $this->actingAs($user)
        ->post(route('monitors.notification-routes.store', $monitor), [
            'priority' => 10,
            'conditions' => ['severity_filter' => null, 'status_filter' => null],
            'channel_ids' => [$foreignChannel->id],
        ])
        ->assertSessionHasErrors('channel_ids.0');

    expect(NotificationRoute::query()->where('monitor_id', $monitor->id)->count())->toBe(0);
});

it('updates a routing rule', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $route = NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$channel->id],
        'priority' => 100,
    ]);

    $this->actingAs($user)
        ->patch(route('monitors.notification-routes.update', [$monitor, $route]), [
            'priority' => 5,
        ])
        ->assertRedirect();

    expect($route->fresh()->priority)->toBe(5);
});

it('destroys a routing rule', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $route = NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
    ]);

    $this->actingAs($user)
        ->delete(route('monitors.notification-routes.destroy', [$monitor, $route]))
        ->assertRedirect();

    expect(NotificationRoute::query()->find($route->id))->toBeNull();
});

it('reorders routing rules by priority', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $a = NotificationRoute::factory()->create(['monitor_id' => $monitor->id, 'team_id' => $monitor->team_id, 'priority' => 100]);
    $b = NotificationRoute::factory()->create(['monitor_id' => $monitor->id, 'team_id' => $monitor->team_id, 'priority' => 200]);
    $c = NotificationRoute::factory()->create(['monitor_id' => $monitor->id, 'team_id' => $monitor->team_id, 'priority' => 300]);

    $this->actingAs($user)
        ->post(route('monitors.notification-routes.reorder', $monitor), [
            'order' => [$c->id, $a->id, $b->id],
        ])
        ->assertRedirect();

    expect($c->fresh()->priority)->toBe(0);
    expect($a->fresh()->priority)->toBe(10);
    expect($b->fresh()->priority)->toBe(20);
});

it('blocks access to other-team monitor routes', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create([
        'team_id' => $other->current_team_id,
    ]);

    $this->actingAs($user)
        ->post(route('monitors.notification-routes.store', $monitor), [
            'priority' => 10,
            'conditions' => ['severity_filter' => null, 'status_filter' => null],
            'channel_ids' => [1],
        ])
        ->assertForbidden();
});
