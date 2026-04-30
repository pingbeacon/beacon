<?php

use App\Actions\HandleStatusChangeAction;
use App\Jobs\SendNotificationJob;
use App\Models\MaintenanceWindow;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationRoute;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

it('dispatches only routed channels when a route matches', function () {
    Queue::fake();

    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->up()->create([
        'team_id' => $user->current_team_id,
    ]);

    $routedChannel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $unroutedChannel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    $monitor->notificationChannels()->attach([$routedChannel->id, $unroutedChannel->id]);

    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'conditions' => ['severity_filter' => null, 'status_filter' => ['down']],
        'channel_ids' => [$routedChannel->id],
    ]);

    $monitor->load('maintenanceWindows', 'notificationChannels');

    (new HandleStatusChangeAction)->execute($monitor, 'down', 'down');

    Queue::assertPushed(SendNotificationJob::class, 1);
    Queue::assertPushed(
        SendNotificationJob::class,
        fn (SendNotificationJob $job) => $job->channel->id === $routedChannel->id,
    );
});

it('falls back to pivot channels when no route matches', function () {
    Queue::fake();

    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->up()->create([
        'team_id' => $user->current_team_id,
    ]);

    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $monitor->notificationChannels()->attach($channel);

    $monitor->load('maintenanceWindows', 'notificationChannels');

    (new HandleStatusChangeAction)->execute($monitor, 'down', 'down');

    Queue::assertPushed(SendNotificationJob::class, 1);
    Queue::assertPushed(
        SendNotificationJob::class,
        fn (SendNotificationJob $job) => $job->channel->id === $channel->id,
    );
});

it('still suppresses notifications during maintenance regardless of routes', function () {
    Queue::fake();

    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->up()->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    NotificationRoute::factory()->create([
        'monitor_id' => $monitor->id,
        'team_id' => $monitor->team_id,
        'channel_ids' => [$channel->id],
    ]);

    $window = MaintenanceWindow::factory()->active()->for($user)->create();
    $window->monitors()->sync([$monitor->id]);

    $monitor->load('maintenanceWindows', 'notificationChannels');

    (new HandleStatusChangeAction)->execute($monitor, 'down', 'down');

    Queue::assertNotPushed(SendNotificationJob::class);
});
