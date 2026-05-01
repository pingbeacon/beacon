<?php

use App\Models\Assertion;
use App\Models\Monitor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an assertion via the store endpoint', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $payload = [
        'type' => 'status',
        'expression' => 'status == 200',
        'severity' => 'critical',
        'on_fail' => 'open_incident',
        'tolerance' => 1,
        'muted' => false,
    ];

    $this->actingAs($user)
        ->post(route('monitors.assertions.store', $monitor), $payload)
        ->assertRedirect();

    $this->assertDatabaseHas('assertions', [
        'monitor_id' => $monitor->id,
        'type' => 'status',
        'expression' => 'status == 200',
        'severity' => 'critical',
    ]);
});

it('rejects an invalid expression with a session error', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('monitors.assertions.store', $monitor), [
            'type' => 'latency',
            'expression' => 'response_time_ms 2000',
            'severity' => 'warning',
            'on_fail' => 'log_only',
        ])
        ->assertSessionHasErrors('expression');
});

it('updates an assertion via patch', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $assertion = Assertion::factory()->for($monitor)->status(200)->create(['muted' => false]);

    $this->actingAs($user)
        ->patch(route('monitors.assertions.update', [$monitor, $assertion]), [
            'muted' => true,
        ])
        ->assertRedirect();

    expect($assertion->fresh()->muted)->toBeTrue();
});

it('deletes an assertion', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $assertion = Assertion::factory()->for($monitor)->status(200)->create();

    $this->actingAs($user)
        ->delete(route('monitors.assertions.destroy', [$monitor, $assertion]))
        ->assertRedirect();

    expect(Assertion::find($assertion->id))->toBeNull();
});

it('forbids cross-team access', function () {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $monitor = Monitor::factory()->for($owner)->create();
    $assertion = Assertion::factory()->for($monitor)->status(200)->create();

    $this->actingAs($stranger)
        ->post(route('monitors.assertions.store', $monitor), [
            'type' => 'status',
            'expression' => 'status == 200',
            'severity' => 'warning',
            'on_fail' => 'log_only',
        ])
        ->assertForbidden();

    $this->actingAs($stranger)
        ->delete(route('monitors.assertions.destroy', [$monitor, $assertion]))
        ->assertForbidden();
});

it('rejects PATCH that changes type without supplying a matching expression', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $assertion = Assertion::factory()->for($monitor)->status(200)->create();

    $this->actingAs($user)
        ->patch(route('monitors.assertions.update', [$monitor, $assertion]), [
            'type' => 'latency',
        ])
        ->assertSessionHasErrors('expression');

    expect($assertion->fresh()->type)->toBe('status');
});

it('rejects assertion belonging to a different monitor', function () {
    $user = User::factory()->create();
    $monitorA = Monitor::factory()->for($user)->create();
    $monitorB = Monitor::factory()->for($user)->create();
    $assertion = Assertion::factory()->for($monitorB)->status(200)->create();

    $this->actingAs($user)
        ->delete(route('monitors.assertions.destroy', [$monitorA, $assertion]))
        ->assertNotFound();
});
