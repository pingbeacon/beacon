<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Assertion;
use App\Models\AssertionResult;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

function showPartialHeaders(string $data): array
{
    $middleware = new HandleInertiaRequests;
    $version = $middleware->version(request());

    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version ?? '',
        'X-Inertia-Partial-Component' => 'monitors/show',
        'X-Inertia-Partial-Data' => $data,
    ];
}

test('warning-severity assertion with recent failures resolves to warn state', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $assertion = Assertion::factory()->for($monitor)->create([
        'type' => 'latency',
        'expression' => 'response_time_ms < 2000',
        'severity' => 'warning',
        'on_fail' => 'log_only',
    ]);
    $heartbeat = Heartbeat::factory()->for($monitor)->create();
    AssertionResult::create([
        'assertion_id' => $assertion->id,
        'heartbeat_id' => $heartbeat->id,
        'passed' => false,
        'actual_value' => '3100',
        'observed_at' => now()->subMinutes(5),
    ]);

    $this->actingAs($user)
        ->withHeaders(showPartialHeaders('assertions'))
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.assertions.0.state', 'warn')
            ->etc()
        );
});

test('critical-severity assertion with recent failures resolves to fail state', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $assertion = Assertion::factory()->for($monitor)->create([
        'type' => 'status',
        'expression' => 'status == 200',
        'severity' => 'critical',
        'on_fail' => 'open_incident',
    ]);
    $heartbeat = Heartbeat::factory()->for($monitor)->create();
    AssertionResult::create([
        'assertion_id' => $assertion->id,
        'heartbeat_id' => $heartbeat->id,
        'passed' => false,
        'actual_value' => '503',
        'observed_at' => now()->subMinutes(5),
    ]);

    $this->actingAs($user)
        ->withHeaders(showPartialHeaders('assertions'))
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.assertions.0.state', 'fail')
            ->etc()
        );
});

test('canUpdateAssertions is true for the monitor owner', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canUpdateAssertions', true));
});

test('passing assertion resolves to pass state regardless of severity', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    Assertion::factory()->for($monitor)->create([
        'type' => 'latency',
        'expression' => 'response_time_ms < 2000',
        'severity' => 'warning',
    ]);

    $this->actingAs($user)
        ->withHeaders(showPartialHeaders('assertions'))
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.assertions.0.state', 'pass')
            ->etc()
        );
});
