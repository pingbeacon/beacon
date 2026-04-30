<?php

use App\Models\EscalationPolicy;
use App\Models\EscalationStep;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;
use App\Services\EscalationContext;
use App\Services\EscalationEngine;

function makeIncidentForTeamMonitor(array $overrides = []): Incident
{
    $user = User::factory()->create();
    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);

    return Incident::factory()->create(array_merge([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinutes(30),
        'resolved_at' => null,
        'acked_at' => null,
    ], $overrides));
}

function makePolicyWithSteps(Incident $incident, array $stepDelays): EscalationPolicy
{
    $policy = EscalationPolicy::factory()->create([
        'team_id' => $incident->monitor->team_id,
        'monitor_id' => $incident->monitor_id,
    ]);

    foreach ($stepDelays as $i => $delay) {
        EscalationStep::factory()->create([
            'escalation_policy_id' => $policy->id,
            'order' => $i + 1,
            'delay_minutes' => $delay,
            'channel_ids' => [],
        ]);
    }

    return $policy->fresh(['steps']);
}

it('fires step 1 immediately when delay is zero', function () {
    $incident = makeIncidentForTeamMonitor(['started_at' => now()]);
    $policy = makePolicyWithSteps($incident, [0]);

    $dispatches = (new EscalationEngine(now()))->tick([
        new EscalationContext($incident, $policy, []),
    ]);

    expect($dispatches)->toHaveCount(1)
        ->and($dispatches[0]->step->order)->toBe(1);
});

it('does not fire step 2 before its delay elapses', function () {
    $incident = makeIncidentForTeamMonitor(['started_at' => now()]);
    $policy = makePolicyWithSteps($incident, [0, 15]);

    $dispatches = (new EscalationEngine(now()->addMinutes(5)))->tick([
        new EscalationContext($incident, $policy, []),
    ]);

    expect(collect($dispatches)->pluck('step.order')->all())->toBe([1]);
});

it('fires step 2 once its delay has elapsed', function () {
    $incident = makeIncidentForTeamMonitor(['started_at' => now()]);
    $policy = makePolicyWithSteps($incident, [0, 15]);

    $dispatches = (new EscalationEngine(now()->addMinutes(20)))->tick([
        new EscalationContext($incident, $policy, []),
    ]);

    expect(collect($dispatches)->pluck('step.order')->all())->toBe([1, 2]);
});

it('does not return steps already in alreadyFiredStepIds', function () {
    $incident = makeIncidentForTeamMonitor(['started_at' => now()]);
    $policy = makePolicyWithSteps($incident, [0, 15]);
    $alreadyFiredId = $policy->steps[0]->id;

    $dispatches = (new EscalationEngine(now()->addMinutes(20)))->tick([
        new EscalationContext($incident, $policy, [$alreadyFiredId]),
    ]);

    expect(collect($dispatches)->pluck('step.order')->all())->toBe([2]);
});

it('returns no dispatches for an acked incident', function () {
    $incident = makeIncidentForTeamMonitor([
        'started_at' => now(),
        'acked_at' => now(),
    ]);
    $policy = makePolicyWithSteps($incident, [0]);

    $dispatches = (new EscalationEngine(now()))->tick([
        new EscalationContext($incident, $policy, []),
    ]);

    expect($dispatches)->toBeEmpty();
});

it('returns no dispatches for a resolved incident', function () {
    $incident = makeIncidentForTeamMonitor([
        'started_at' => now(),
        'resolved_at' => now(),
    ]);
    $policy = makePolicyWithSteps($incident, [0]);

    $dispatches = (new EscalationEngine(now()))->tick([
        new EscalationContext($incident, $policy, []),
    ]);

    expect($dispatches)->toBeEmpty();
});

it('fires multiple due steps in order in one tick', function () {
    $incident = makeIncidentForTeamMonitor(['started_at' => now()]);
    $policy = makePolicyWithSteps($incident, [0, 5, 10]);

    $dispatches = (new EscalationEngine(now()->addMinutes(11)))->tick([
        new EscalationContext($incident, $policy, []),
    ]);

    expect(collect($dispatches)->pluck('step.order')->all())->toBe([1, 2, 3]);
});
