<?php

use App\Jobs\RunEscalationsJob;
use App\Jobs\SendNotificationJob;
use App\Models\EscalationFire;
use App\Models\EscalationPolicy;
use App\Models\EscalationStep;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

function setUpTeamMonitorIncident(): array
{
    $user = User::factory()->create();
    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);
    $incident = Incident::factory()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinutes(20),
        'resolved_at' => null,
        'acked_at' => null,
    ]);

    return compact('user', 'monitor', 'incident', 'channel');
}

function setUpMonitorPolicy(int $monitorId, int $teamId, int $channelId, array $delays = [0, 15]): EscalationPolicy
{
    $policy = EscalationPolicy::factory()->create([
        'team_id' => $teamId,
        'monitor_id' => $monitorId,
    ]);
    foreach ($delays as $i => $delay) {
        EscalationStep::factory()->create([
            'escalation_policy_id' => $policy->id,
            'order' => $i + 1,
            'delay_minutes' => $delay,
            'channel_ids' => [$channelId],
        ]);
    }

    return $policy;
}

it('dispatches a SendNotificationJob for each due step channel', function () {
    Bus::fake();
    $ctx = setUpTeamMonitorIncident();
    setUpMonitorPolicy($ctx['monitor']->id, $ctx['monitor']->team_id, $ctx['channel']->id, [0, 15]);

    (new RunEscalationsJob)->handle();

    Bus::assertDispatchedTimes(SendNotificationJob::class, 2);
    expect(EscalationFire::count())->toBe(2);
});

it('is idempotent across repeated runs', function () {
    Bus::fake();
    $ctx = setUpTeamMonitorIncident();
    setUpMonitorPolicy($ctx['monitor']->id, $ctx['monitor']->team_id, $ctx['channel']->id, [0, 15]);

    (new RunEscalationsJob)->handle();
    (new RunEscalationsJob)->handle();
    (new RunEscalationsJob)->handle();

    Bus::assertDispatchedTimes(SendNotificationJob::class, 2);
    expect(EscalationFire::count())->toBe(2);
});

it('does not dispatch for an acked incident', function () {
    Bus::fake();
    $ctx = setUpTeamMonitorIncident();
    $ctx['incident']->update(['acked_at' => now()]);
    setUpMonitorPolicy($ctx['monitor']->id, $ctx['monitor']->team_id, $ctx['channel']->id, [0, 15]);

    (new RunEscalationsJob)->handle();

    Bus::assertNothingDispatched();
    expect(EscalationFire::count())->toBe(0);
});

it('does not dispatch for a resolved incident', function () {
    Bus::fake();
    $ctx = setUpTeamMonitorIncident();
    $ctx['incident']->update(['resolved_at' => now()]);
    setUpMonitorPolicy($ctx['monitor']->id, $ctx['monitor']->team_id, $ctx['channel']->id, [0, 15]);

    (new RunEscalationsJob)->handle();

    Bus::assertNothingDispatched();
});

it('prefers a monitor-specific policy over a team-wide policy', function () {
    Bus::fake();
    $ctx = setUpTeamMonitorIncident();
    $teamChannel = NotificationChannel::factory()->create([
        'user_id' => $ctx['user']->id,
        'team_id' => $ctx['user']->current_team_id,
    ]);

    $teamPolicy = EscalationPolicy::factory()->create([
        'team_id' => $ctx['user']->current_team_id,
        'monitor_id' => null,
    ]);
    EscalationStep::factory()->create([
        'escalation_policy_id' => $teamPolicy->id,
        'order' => 1,
        'delay_minutes' => 0,
        'channel_ids' => [$teamChannel->id],
    ]);

    setUpMonitorPolicy($ctx['monitor']->id, $ctx['monitor']->team_id, $ctx['channel']->id, [0]);

    (new RunEscalationsJob)->handle();

    Bus::assertDispatchedTimes(SendNotificationJob::class, 1);
    Bus::assertDispatched(SendNotificationJob::class, fn ($job) => $job->channel->id === $ctx['channel']->id);
});

it('falls back to a team-wide policy when no monitor policy exists', function () {
    Bus::fake();
    $ctx = setUpTeamMonitorIncident();
    $teamPolicy = EscalationPolicy::factory()->create([
        'team_id' => $ctx['user']->current_team_id,
        'monitor_id' => null,
    ]);
    EscalationStep::factory()->create([
        'escalation_policy_id' => $teamPolicy->id,
        'order' => 1,
        'delay_minutes' => 0,
        'channel_ids' => [$ctx['channel']->id],
    ]);

    (new RunEscalationsJob)->handle();

    Bus::assertDispatchedTimes(SendNotificationJob::class, 1);
});
