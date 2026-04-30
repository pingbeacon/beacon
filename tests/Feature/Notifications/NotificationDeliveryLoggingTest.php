<?php

use App\Jobs\SendNotificationJob;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\Notifiers\Notifier;
use Illuminate\Support\Facades\Schema;

it('writes a delivered row when the notifier succeeds', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    app()->bind(Notifier::class, fn () => new class implements Notifier
    {
        public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void {}
    });

    $job = new SendNotificationJob(
        channel: $channel,
        monitor: $monitor,
        status: 'down',
        message: 'down',
        incidentId: null,
        eventType: 'status_flip',
    );

    $job->handle();

    expect(NotificationDelivery::query()->count())->toBe(1);

    $delivery = NotificationDelivery::query()->sole();

    expect($delivery->channel_id)->toBe($channel->id);
    expect($delivery->monitor_id)->toBe($monitor->id);
    expect($delivery->team_id)->toBe($monitor->team_id);
    expect($delivery->event_type)->toBe('status_flip');
    expect($delivery->status)->toBe('delivered');
    expect($delivery->error)->toBeNull();
    expect($delivery->latency_ms)->toBeGreaterThanOrEqual(0);
    expect($delivery->dispatched_at)->not->toBeNull();
});

it('writes a failed row and rethrows when the notifier throws', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    app()->bind(Notifier::class, fn () => new class implements Notifier
    {
        public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void
        {
            throw new RuntimeException('upstream 503');
        }
    });

    $job = new SendNotificationJob(
        channel: $channel,
        monitor: $monitor,
        status: 'down',
        message: 'down',
        incidentId: null,
        eventType: 'status_flip',
    );

    $threw = false;
    try {
        $job->handle();
    } catch (RuntimeException $e) {
        $threw = true;
        expect($e->getMessage())->toBe('upstream 503');
    }

    expect($threw)->toBeTrue();

    $delivery = NotificationDelivery::query()->sole();

    expect($delivery->status)->toBe('failed');
    expect($delivery->error)->toBe('upstream 503');
    expect($delivery->channel_id)->toBe($channel->id);
});

it('does not rethrow when post-send logging fails (avoids duplicate sends on retry)', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);

    app()->bind(Notifier::class, fn () => new class implements Notifier
    {
        public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void {}
    });

    Schema::drop('notification_deliveries');

    $job = new SendNotificationJob(
        channel: $channel,
        monitor: $monitor,
        status: 'down',
        message: 'down',
        incidentId: null,
        eventType: 'status_flip',
    );

    $job->handle();

    expect(true)->toBeTrue();
});

it('throws before persisting when channel and monitor belong to different teams', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $monitor = Monitor::factory()->for($owner)->create([
        'team_id' => $owner->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($other)->create([
        'team_id' => $other->current_team_id,
    ]);

    app()->bind(Notifier::class, fn () => new class implements Notifier
    {
        public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void {}
    });

    $job = new SendNotificationJob(
        channel: $channel,
        monitor: $monitor,
        status: 'down',
        message: 'cross-team',
        incidentId: null,
        eventType: 'status_flip',
    );

    expect(fn () => $job->handle())->toThrow(LogicException::class);
    expect(NotificationDelivery::query()->count())->toBe(0);
});

it('records the incident_id when one is provided', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
    ]);
    $incident = Incident::factory()->for($monitor)->create();

    app()->bind(Notifier::class, fn () => new class implements Notifier
    {
        public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null, ?string $ackUrl = null): void {}
    });

    $job = new SendNotificationJob(
        channel: $channel,
        monitor: $monitor,
        status: 'down',
        message: 'down',
        incidentId: $incident->id,
        eventType: 'status_flip',
    );

    $job->handle();

    expect(NotificationDelivery::query()->sole()->incident_id)->toBe($incident->id);
});
