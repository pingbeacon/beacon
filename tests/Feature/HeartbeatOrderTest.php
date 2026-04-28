<?php

use App\Events\HeartbeatRecorded;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\StatusPage;
use App\Models\User;

function makeMonitorWithSequencedHeartbeats(User $user, int $count = 5): Monitor
{
    $monitor = Monitor::factory()->for($user)->create();

    for ($i = 0; $i < $count; $i++) {
        Heartbeat::factory()->for($monitor)->create([
            'created_at' => now()->subMinutes($count - $i),
        ]);
    }

    return $monitor;
}

function assertAscByCreatedAt(array $heartbeats): void
{
    $timestamps = array_map(fn ($h) => $h['created_at'], $heartbeats);
    $sorted = $timestamps;
    sort($sorted);
    expect($timestamps)->toBe($sorted);
}

test('dashboard payload returns heartbeats sorted oldest-first by created_at', function () {
    $user = User::factory()->create();
    makeMonitorWithSequencedHeartbeats($user, 5);

    $response = $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('dashboard', 'monitors'))
        ->get('/dashboard')
        ->assertOk();

    $monitors = $response->json('props.monitors');
    expect($monitors)->not->toBeNull();
    assertAscByCreatedAt($monitors[0]['heartbeats']);
});

test('monitors index payload returns heartbeats sorted oldest-first by created_at', function () {
    $user = User::factory()->create();
    makeMonitorWithSequencedHeartbeats($user, 5);

    $response = $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('monitors/index', 'monitors'))
        ->get('/monitors')
        ->assertOk();

    $monitors = $response->json('props.monitors');
    expect($monitors)->not->toBeNull();
    assertAscByCreatedAt($monitors[0]['heartbeats']);
});

test('paginated heartbeats payload on monitor show is sorted oldest-first by created_at', function () {
    $user = User::factory()->create();
    $monitor = makeMonitorWithSequencedHeartbeats($user, 5);

    $response = $this->actingAs($user)
        ->withHeaders(inertiaPartialHeaders('monitors/show', 'heartbeats'))
        ->get("/monitors/{$monitor->id}")
        ->assertOk();

    $data = $response->json('props.heartbeats.data');
    expect($data)->not->toBeNull();
    assertAscByCreatedAt($data);
});

test('public status page payload returns heartbeats sorted oldest-first by created_at', function () {
    $user = User::factory()->create();
    $monitor = makeMonitorWithSequencedHeartbeats($user, 5);
    $statusPage = StatusPage::factory()->for($user)->create([
        'is_published' => true,
    ]);
    $statusPage->monitors()->attach($monitor);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(function ($page) {
            $monitors = $page->toArray()['props']['monitors'];
            assertAscByCreatedAt($monitors[0]['heartbeats']);
        });
});

test('HeartbeatRecorded broadcast payload exposes heartbeat created_at as ISO string', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $heartbeat = Heartbeat::factory()->for($monitor)->create([
        'created_at' => now()->subMinute(),
    ]);

    $event = new HeartbeatRecorded($monitor->refresh(), $heartbeat->refresh());
    $payload = $event->broadcastWith();

    expect($payload['heartbeat']['created_at'])->toBe($heartbeat->created_at->toISOString());
});
