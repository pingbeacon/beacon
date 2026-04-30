<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function monitorsListHeaders(): array
{
    $middleware = new HandleInertiaRequests;
    $version = $middleware->version(request());

    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => $version ?? '',
        'X-Inertia-Partial-Component' => 'monitors/index',
        'X-Inertia-Partial-Data' => 'monitors',
    ];
}

test('monitors index includes uptime_percentage and average_response_time per monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create(['user_id' => $user->id]);

    Heartbeat::factory()->count(8)->for($monitor)->create([
        'status' => 'up',
        'response_time' => 100,
        'created_at' => now()->subMinutes(10),
    ]);
    Heartbeat::factory()->count(2)->for($monitor)->create([
        'status' => 'down',
        'response_time' => null,
        'created_at' => now()->subMinutes(5),
    ]);

    $this->actingAs($user)
        ->withHeaders(monitorsListHeaders())
        ->get('/monitors')
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->where('props.monitors.0.uptime_percentage', fn ($v) => (float) $v === 80.0)
            ->where('props.monitors.0.average_response_time', fn ($v) => (float) $v === 100.0)
            ->etc()
        );
});

test('monitors index issues no N+1 queries when scaling monitor count', function () {
    $user = User::factory()->create();

    $monitors = Monitor::factory()->up()->count(8)->create(['user_id' => $user->id]);
    foreach ($monitors as $m) {
        Heartbeat::factory()->count(5)->for($m)->create(['status' => 'up', 'response_time' => 120]);
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->actingAs($user)
        ->withHeaders(monitorsListHeaders())
        ->get('/monitors')
        ->assertOk();

    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Hard cap: page resolution + auth + tags + groups + monitors + heartbeats eager-load
    // must not grow with monitor count.
    expect($queryCount)->toBeLessThan(20);
});

test('monitors index eager-loads heartbeats so the 48-bucket strip can render without per-row queries', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create(['user_id' => $user->id]);
    Heartbeat::factory()->count(50)->for($monitor)->create(['status' => 'up', 'response_time' => 200]);

    $this->actingAs($user)
        ->withHeaders(monitorsListHeaders())
        ->get('/monitors')
        ->assertOk()
        ->assertJson(fn ($json) => $json
            ->has('props.monitors.0.heartbeats')
            ->where('props.monitors.0.heartbeats', fn ($heartbeats) => count($heartbeats) >= 48)
            ->etc()
        );
});

test('tags filter chips render only the team tags', function () {
    $user = User::factory()->create();
    Tag::factory()->count(3)->create(['team_id' => $user->current_team_id]);
    Tag::factory()->count(2)->create(); // other team

    $this->actingAs($user)
        ->get('/monitors')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('monitors/index')
            ->has('tags', 3)
        );
});
