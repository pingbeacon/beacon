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

test('uptimeStats calculates correctly for different time ranges', function () {
    $monitor = Monitor::factory()->create();

    // Create heartbeats within 24h: 8 up, 2 down = 80%
    Heartbeat::factory()->for($monitor)->up()->count(8)->create([
        'created_at' => now()->subHours(1),
        'response_time' => 100,
    ]);
    Heartbeat::factory()->for($monitor)->down()->count(2)->create([
        'created_at' => now()->subHours(1),
        'response_time' => null,
    ]);

    // Create heartbeats within 7d but outside 24h: 10 up = pushes 7d uptime higher
    Heartbeat::factory()->for($monitor)->up()->count(10)->create([
        'created_at' => now()->subDays(3),
        'response_time' => 200,
    ]);

    $stats = $monitor->uptimeStats();

    expect($stats['uptime_24h'])->toBe(80.0)
        ->and($stats['uptime_7d'])->toBeGreaterThan(80.0)
        ->and($stats['uptime_30d'])->toBeGreaterThan(80.0);
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
