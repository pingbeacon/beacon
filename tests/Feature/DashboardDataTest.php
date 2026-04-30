<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;

test('dashboard deferred monitors include all team monitors with their status', function () {
    $user = User::factory()->create();
    Monitor::factory()->up()->create(['user_id' => $user->id]);
    Monitor::factory()->up()->create(['user_id' => $user->id]);
    Monitor::factory()->down()->create(['user_id' => $user->id]);
    Monitor::factory()->paused()->create(['user_id' => $user->id]);

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->loadDeferredProps('default', fn ($page) => $page
                ->has('monitors', 4)
                ->where('monitors', fn ($monitors) => collect($monitors)
                    ->countBy('status')
                    ->all() === ['up' => 2, 'down' => 1, 'paused' => 1])
            )
        );
});

test('dashboard renders for user with no monitors', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->loadDeferredProps('default', fn ($page) => $page->has('monitors', 0))
        );
});

function dashboardMonitorsHeaders(): array
{
    $middleware = new HandleInertiaRequests;
    $version = $middleware->version(request());

    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version ?? '',
        'X-Inertia-Partial-Component' => 'dashboard',
        'X-Inertia-Partial-Data' => 'monitors',
    ];
}

test('has_incidents_24h is true for unresolved incident started over 24h ago', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create(['user_id' => $user->id]);
    Incident::factory()->for($monitor)->create([
        'started_at' => now()->subHours(30),
        'resolved_at' => null,
    ]);

    $this->actingAs($user)
        ->withHeaders(dashboardMonitorsHeaders())
        ->get('/dashboard')
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.monitors.0.has_incidents_24h', true)
            ->etc()
        );
});

test('has_incidents_24h is true for incident started within 24h', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create(['user_id' => $user->id]);
    Incident::factory()->for($monitor)->create([
        'started_at' => now()->subHours(2),
        'resolved_at' => null,
    ]);

    $this->actingAs($user)
        ->withHeaders(dashboardMonitorsHeaders())
        ->get('/dashboard')
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.monitors.0.has_incidents_24h', true)
            ->etc()
        );
});

test('has_incidents_24h is false for resolved incident outside 24h window', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create(['user_id' => $user->id]);
    Incident::factory()->for($monitor)->create([
        'started_at' => now()->subHours(48),
        'resolved_at' => now()->subHours(40),
    ]);

    $this->actingAs($user)
        ->withHeaders(dashboardMonitorsHeaders())
        ->get('/dashboard')
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.monitors.0.has_incidents_24h', false)
            ->etc()
        );
});

test('team_uptime_30d aggregates heartbeats across active monitors', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create(['user_id' => $user->id]);

    Heartbeat::factory()->up()->count(8)->create([
        'monitor_id' => $monitor->id,
        'created_at' => now()->subHours(1),
    ]);
    Heartbeat::factory()->down()->count(2)->create([
        'monitor_id' => $monitor->id,
        'created_at' => now()->subHours(1),
    ]);

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('team_uptime_30d', 80)
        );
});

test('dashboard only shows monitors for authenticated user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Monitor::factory()->up()->count(3)->create(['user_id' => $user->id]);
    Monitor::factory()->up()->count(5)->create(['user_id' => $otherUser->id]);

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->loadDeferredProps('default', fn ($page) => $page->has('monitors', 3))
        );
});
