<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

function inertiaPartialHeaders(string $component, string $data): array
{
    $middleware = new HandleInertiaRequests;
    $version = $middleware->version(request());

    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version ?? '',
        'X-Inertia-Partial-Component' => $component,
        'X-Inertia-Partial-Data' => $data,
    ];
}

test('heartbeats are paginated at 50 per page on monitor show', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    Heartbeat::factory()->count(55)->for($monitor)->create();

    $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('monitors/show', 'heartbeats'))
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.heartbeats.meta.total', 55)
            ->where('props.heartbeats.meta.per_page', 50)
            ->where('props.heartbeats.meta.last_page', 2)
            ->where('props.heartbeats.meta.current_page', 1)
            ->has('props.heartbeats.data', 50)
            ->etc()
        );
});

test('heartbeats page 2 returns remaining records', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    Heartbeat::factory()->count(55)->for($monitor)->create();

    $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('monitors/show', 'heartbeats'))
        ->get("/monitors/{$monitor->id}?page=2")
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.heartbeats.meta.current_page', 2)
            ->has('props.heartbeats.data', 5)
            ->etc()
        );
});

test('heartbeats pagination scopes to the monitors team', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $monitor = Monitor::factory()->for($user)->create();
    $otherMonitor = Monitor::factory()->for($other)->create();

    Heartbeat::factory()->count(10)->for($monitor)->create();
    Heartbeat::factory()->count(10)->for($otherMonitor)->create();

    $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('monitors/show', 'heartbeats'))
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.heartbeats.meta.total', 10)
            ->etc()
        );
});

test('user cannot access another teams monitor heartbeats', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $otherMonitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('monitors/show', 'heartbeats'))
        ->get("/monitors/{$otherMonitor->id}")
        ->assertForbidden();
});
