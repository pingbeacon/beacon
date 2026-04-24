<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

test('uptimeStats returns correct structure', function () {
    $monitor = Monitor::factory()->create();

    $stats = $monitor->uptimeStats();

    expect($stats)->toHaveKeys([
        'uptime_24h',
        'uptime_7d',
        'uptime_30d',
        'avg_response_24h',
        'avg_response_7d',
        'avg_response_30d',
    ]);
});

test('uptimeStats returns 100% when no heartbeats exist', function () {
    $monitor = Monitor::factory()->create();

    $stats = $monitor->uptimeStats();

    expect($stats['uptime_24h'])->toBe(100.0)
        ->and($stats['uptime_7d'])->toBe(100.0)
        ->and($stats['uptime_30d'])->toBe(100.0);
});

test('uptimeStats calculates correctly using expected checks as denominator', function () {
    // interval=60s, created 10 minutes ago → 10 expected checks per window
    $monitor = Monitor::factory()->create([
        'interval' => 60,
        'created_at' => now()->subMinutes(10),
    ]);

    // 8 up + 2 down = 10 actual = 10 expected → 80%
    Heartbeat::factory()->for($monitor)->up()->count(8)->create([
        'created_at' => now()->subMinutes(5),
        'response_time' => 100,
    ]);
    Heartbeat::factory()->for($monitor)->down()->count(2)->create([
        'created_at' => now()->subMinutes(5),
        'response_time' => null,
    ]);

    $stats = $monitor->uptimeStats();

    // All windows capped to monitor age (10 min) → same expected count → same result
    expect($stats['uptime_24h'])->toBe(80.0)
        ->and($stats['uptime_7d'])->toBe(80.0)
        ->and($stats['uptime_30d'])->toBe(80.0);
});

test('uptimeStats returns null avg response time when no response times', function () {
    $monitor = Monitor::factory()->create();

    Heartbeat::factory()->for($monitor)->down()->count(3)->create([
        'created_at' => now()->subHours(1),
        'response_time' => null,
    ]);

    $stats = $monitor->uptimeStats();

    expect($stats['avg_response_24h'])->toBeNull();
});

test('monitor show page loads successfully', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    Heartbeat::factory()->for($monitor)->up()->count(5)->create([
        'created_at' => now()->subHours(1),
        'response_time' => 150,
    ]);

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('monitors/show')
            ->has('monitor')
        );
});
