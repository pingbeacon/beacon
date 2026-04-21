<?php

use App\Actions\HandleStatusChangeAction;
use App\Jobs\SendNotificationJob;
use App\Models\MaintenanceWindow;
use App\Models\Monitor;
use App\Models\MonitorGroup;
use App\Models\NotificationChannel;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

// --- Guest redirects ---

test('guests are redirected to login for maintenance windows index', function () {
    $this->get('/maintenance-windows')->assertRedirect('/login');
});

// --- CRUD ---

test('user can view maintenance windows index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/maintenance-windows')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('maintenance-windows/index'));
});

test('user can create a maintenance window', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/maintenance-windows', [
            'title' => 'Server Upgrade',
            'start_time' => now()->addHour()->toDateTimeString(),
            'end_time' => now()->addHours(3)->toDateTimeString(),
            'timezone' => 'UTC',
            'monitor_ids' => [$monitor->id],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/maintenance-windows');

    $window = MaintenanceWindow::where('user_id', $user->id)->first();
    expect($window)->not->toBeNull();
    expect($window->title)->toBe('Server Upgrade');
    expect($window->monitors)->toHaveCount(1);
});

test('maintenance window creation fails without title', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/maintenance-windows', [
            'start_time' => now()->addHour()->toDateTimeString(),
            'end_time' => now()->addHours(3)->toDateTimeString(),
            'timezone' => 'UTC',
        ])
        ->assertSessionHasErrors('title');
});

test('maintenance window creation fails when end_time is before start_time', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/maintenance-windows', [
            'title' => 'Bad Window',
            'start_time' => now()->addHours(3)->toDateTimeString(),
            'end_time' => now()->addHour()->toDateTimeString(),
            'timezone' => 'UTC',
        ])
        ->assertSessionHasErrors('end_time');
});

test('user can update their maintenance window', function () {
    $user = User::factory()->create();
    $window = MaintenanceWindow::factory()->for($user)->create(['title' => 'Old Title']);

    $this->actingAs($user)
        ->put("/maintenance-windows/{$window->id}", [
            'title' => 'New Title',
            'start_time' => $window->start_time->toDateTimeString(),
            'end_time' => $window->end_time->toDateTimeString(),
            'timezone' => 'UTC',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/maintenance-windows');

    expect($window->fresh()->title)->toBe('New Title');
});

test('user cannot update another users maintenance window', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $window = MaintenanceWindow::factory()->for($other)->create();

    $this->actingAs($user)
        ->put("/maintenance-windows/{$window->id}", [
            'title' => 'Hacked',
            'start_time' => $window->start_time->toDateTimeString(),
            'end_time' => $window->end_time->toDateTimeString(),
            'timezone' => 'UTC',
        ])
        ->assertForbidden();
});

test('user can delete their maintenance window', function () {
    $user = User::factory()->create();
    $window = MaintenanceWindow::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete("/maintenance-windows/{$window->id}")
        ->assertRedirect('/maintenance-windows');

    expect($window->fresh())->toBeNull();
});

test('user cannot delete another users maintenance window', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $window = MaintenanceWindow::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete("/maintenance-windows/{$window->id}")
        ->assertForbidden();
});

// --- isCurrentlyActive ---

test('one-time window is active when current time is within range', function () {
    $window = MaintenanceWindow::factory()->active()->make();

    expect($window->isCurrentlyActive())->toBeTrue();
});

test('one-time window is not active when in future', function () {
    $window = MaintenanceWindow::factory()->make([
        'start_time' => now()->addHour(),
        'end_time' => now()->addHours(3),
    ]);

    expect($window->isCurrentlyActive())->toBeFalse();
});

test('one-time window is not active when in past', function () {
    $window = MaintenanceWindow::factory()->past()->make();

    expect($window->isCurrentlyActive())->toBeFalse();
});

test('disabled window is not active', function () {
    $window = MaintenanceWindow::factory()->active()->make(['is_active' => false]);

    expect($window->isCurrentlyActive())->toBeFalse();
});

test('recurring daily window is active during time range', function () {
    $window = MaintenanceWindow::factory()->active()->recurring('daily')->make();

    expect($window->isCurrentlyActive())->toBeTrue();
});

// --- Notification suppression ---

test('notifications are suppressed during maintenance', function () {
    Queue::fake();

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor = Monitor::factory()->http()->up()->for($user)->create();
    $monitor->notificationChannels()->sync([$channel->id]);

    $window = MaintenanceWindow::factory()->active()->for($user)->create();
    $window->monitors()->sync([$monitor->id]);

    $monitor->load('maintenanceWindows', 'notificationChannels');

    $action = new HandleStatusChangeAction;
    $action->execute($monitor, 'down', 'Server error');

    Queue::assertNotPushed(SendNotificationJob::class);
});

test('notifications are sent when not in maintenance', function () {
    Queue::fake();

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor = Monitor::factory()->http()->up()->for($user)->create();
    $monitor->notificationChannels()->sync([$channel->id]);

    $monitor->load('maintenanceWindows', 'notificationChannels');

    $action = new HandleStatusChangeAction;
    $action->execute($monitor, 'down', 'Server error');

    Queue::assertPushed(SendNotificationJob::class);
});

// --- Heartbeats still recorded ---

test('heartbeats are still recorded during maintenance', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $window = MaintenanceWindow::factory()->active()->for($user)->create();
    $window->monitors()->sync([$monitor->id]);

    $heartbeat = $monitor->heartbeats()->create([
        'status' => 'up',
        'status_code' => 200,
        'response_time' => 150,
    ]);

    expect($heartbeat)->not->toBeNull();
    expect($monitor->heartbeats()->count())->toBe(1);
});

// --- User scoping ---

test('user cannot assign another users monitor to maintenance window', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherMonitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/maintenance-windows', [
            'title' => 'Sneaky',
            'start_time' => now()->addHour()->toDateTimeString(),
            'end_time' => now()->addHours(3)->toDateTimeString(),
            'timezone' => 'UTC',
            'monitor_ids' => [$otherMonitor->id],
        ])
        ->assertSessionHasErrors('monitor_ids.0');
});

test('user can assign monitor group to maintenance window', function () {
    $user = User::factory()->create();
    $group = MonitorGroup::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/maintenance-windows', [
            'title' => 'Group Maintenance',
            'start_time' => now()->addHour()->toDateTimeString(),
            'end_time' => now()->addHours(3)->toDateTimeString(),
            'timezone' => 'UTC',
            'monitor_group_ids' => [$group->id],
        ])
        ->assertSessionHasNoErrors();

    $window = MaintenanceWindow::where('user_id', $user->id)->first();
    expect($window->monitorGroups)->toHaveCount(1);
});
