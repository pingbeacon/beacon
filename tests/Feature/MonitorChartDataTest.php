<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

test('monitor show includes chartPeriod prop defaulting to 24h', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('monitors/show')
            ->where('chartPeriod', '24h')
        );
});

test('monitor show accepts valid period query param', function (string $period) {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}?period={$period}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('chartPeriod', $period));
})->with(['1h', '24h', '7d', '30d']);

test('monitor show rejects invalid period and falls back to 24h', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}?period=99d")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('chartPeriod', '24h'));
});

test('chart data only includes heartbeats within the selected period', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    // Heartbeat inside 1h window
    Heartbeat::factory()->for($monitor)->create([
        'response_time' => 100,
        'created_at' => now()->subMinutes(30),
    ]);

    // Heartbeat outside 1h window but inside 24h
    Heartbeat::factory()->for($monitor)->create([
        'response_time' => 200,
        'created_at' => now()->subHours(2),
    ]);

    $response = $this->actingAs($user)
        ->get("/monitors/{$monitor->id}?period=1h")
        ->assertOk();

    // The deferred chartData should only include the heartbeat from the last hour
    $response->assertInertia(fn ($page) => $page
        ->where('chartPeriod', '1h')
    );
});
