<?php

use App\Models\EscalationFire;
use App\Models\EscalationPolicy;
use App\Models\EscalationStep;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('passes a monitor-specific escalation policy with steps to the show view', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);
    $channel = NotificationChannel::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);

    $policy = EscalationPolicy::factory()->create([
        'team_id' => $user->current_team_id,
        'monitor_id' => $monitor->id,
        'name' => 'Critical incidents',
    ]);
    EscalationStep::factory()->create([
        'escalation_policy_id' => $policy->id,
        'order' => 1,
        'delay_minutes' => 0,
        'channel_ids' => [$channel->id],
    ]);
    EscalationStep::factory()->create([
        'escalation_policy_id' => $policy->id,
        'order' => 2,
        'delay_minutes' => 15,
        'channel_ids' => [$channel->id],
    ]);

    $this->actingAs($user)
        ->get(route('monitors.show', $monitor))
        ->assertInertia(fn (Assert $page) => $page
            ->component('monitors/show')
            ->has('escalationPolicy.steps', 2)
            ->where('escalationPolicy.name', 'Critical incidents')
            ->where('escalationPolicy.steps.0.order', 1)
            ->where('escalationPolicy.steps.1.delay_minutes', 15)
        );
});

it('falls back to a team-wide policy when no monitor policy exists', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);

    $policy = EscalationPolicy::factory()->create([
        'team_id' => $user->current_team_id,
        'monitor_id' => null,
        'name' => 'Team default',
    ]);
    EscalationStep::factory()->create([
        'escalation_policy_id' => $policy->id,
        'order' => 1,
        'delay_minutes' => 0,
        'channel_ids' => [],
    ]);

    $this->actingAs($user)
        ->get(route('monitors.show', $monitor))
        ->assertInertia(fn (Assert $page) => $page
            ->where('escalationPolicy.name', 'Team default')
        );
});

it('exposes activeEscalation with fired step ids when an incident is in flight', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);

    $policy = EscalationPolicy::factory()->create([
        'team_id' => $user->current_team_id,
        'monitor_id' => $monitor->id,
    ]);
    $step = EscalationStep::factory()->create([
        'escalation_policy_id' => $policy->id,
        'order' => 1,
        'delay_minutes' => 0,
        'channel_ids' => [],
    ]);

    $incident = Incident::factory()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinutes(5),
        'resolved_at' => null,
        'acked_at' => null,
    ]);
    EscalationFire::factory()->create([
        'incident_id' => $incident->id,
        'escalation_step_id' => $step->id,
    ]);

    $this->actingAs($user)
        ->get(route('monitors.show', $monitor))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activeEscalation.incident_id', $incident->id)
            ->where('activeEscalation.fired_step_ids', [$step->id])
        );
});

it('null escalation props when no policy', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
    ]);

    $this->actingAs($user)
        ->get(route('monitors.show', $monitor))
        ->assertInertia(fn (Assert $page) => $page
            ->where('escalationPolicy', null)
            ->where('activeEscalation', null)
        );
});
