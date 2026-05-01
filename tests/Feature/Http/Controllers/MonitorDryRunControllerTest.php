<?php

use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns a pass verdict from a stored heartbeat source', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $heartbeat = Heartbeat::factory()->for($monitor)->create([
        'status_code' => 200,
        'response_time' => 42,
    ]);

    $response = $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
        'expression' => 'status == 200',
        'source' => 'heartbeat',
        'heartbeat_id' => $heartbeat->id,
    ]);

    $response->assertOk();
    $response->assertJson([
        'verdict' => 'pass',
        'type' => 'status',
        'expression' => 'status == 200',
        'actual_value' => '200',
        'parse_error' => null,
    ]);
    expect((float) $response->json('evaluation_ms'))->toBeGreaterThanOrEqual(0.0);
});

it('returns a fail verdict from a pasted response source', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $response = $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'latency',
        'expression' => 'response_time_ms < 2000',
        'source' => 'pasted',
        'response' => [
            'status_code' => 200,
            'latency_ms' => 4218,
            'body' => '{"status":"ok"}',
            'headers' => ['content-type' => 'application/json'],
        ],
    ]);

    $response->assertOk();
    $response->assertJson([
        'verdict' => 'fail',
        'actual_value' => '4218',
    ]);
});

it('returns a parse_error verdict for a malformed expression', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $response = $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'latency',
        'expression' => 'response_time_ms 2000',
        'source' => 'pasted',
        'response' => ['status_code' => 200, 'latency_ms' => 100],
    ]);

    $response->assertOk();
    $response->assertJson(['verdict' => 'parse_error']);
    expect($response->json('parse_error'))->not->toBeNull();
});

it('writes zero rows to assertion_results, incidents, notification_deliveries across pass/fail/parse paths', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $heartbeat = Heartbeat::factory()->for($monitor)->create(['status_code' => 503, 'response_time' => 4500]);

    $before = [
        'assertion_results' => DB::table('assertion_results')->count(),
        'incidents' => Incident::query()->count(),
        'notification_deliveries' => NotificationDelivery::query()->count(),
        'heartbeats' => Heartbeat::query()->count(),
    ];

    $cases = [
        ['type' => 'status', 'expression' => 'status == 503'],
        ['type' => 'status', 'expression' => 'status == 200'],
        ['type' => 'latency', 'expression' => 'response_time_ms 2000'],
    ];

    foreach ($cases as $case) {
        $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
            'type' => $case['type'],
            'expression' => $case['expression'],
            'source' => 'heartbeat',
            'heartbeat_id' => $heartbeat->id,
        ])->assertOk();
    }

    expect(DB::table('assertion_results')->count())->toBe($before['assertion_results']);
    expect(Incident::query()->count())->toBe($before['incidents']);
    expect(NotificationDelivery::query()->count())->toBe($before['notification_deliveries']);
    expect(Heartbeat::query()->count())->toBe($before['heartbeats']);
});

it('rejects a heartbeat that does not belong to the monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $otherMonitor = Monitor::factory()->for($user)->create();
    $foreignHeartbeat = Heartbeat::factory()->for($otherMonitor)->create();

    $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
        'expression' => 'status == 200',
        'source' => 'heartbeat',
        'heartbeat_id' => $foreignHeartbeat->id,
    ])->assertNotFound();
});

it('rejects an unauthenticated request', function () {
    $monitor = Monitor::factory()->create();

    $this->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
        'expression' => 'status == 200',
        'source' => 'pasted',
        'response' => ['status_code' => 200, 'latency_ms' => 50],
    ])->assertUnauthorized();
});

it('rejects a request from a user who cannot view the monitor', function () {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $monitor = Monitor::factory()->for($owner)->create();

    $this->actingAs($intruder)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
        'expression' => 'status == 200',
        'source' => 'pasted',
        'response' => ['status_code' => 200, 'latency_ms' => 50],
    ])->assertForbidden();
});

it('returns validation errors for missing required fields', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
    ])->assertJsonValidationErrors(['expression', 'source']);
});

it('returns validation errors when source=heartbeat without heartbeat_id', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
        'expression' => 'status == 200',
        'source' => 'heartbeat',
    ])->assertJsonValidationErrors(['heartbeat_id']);
});

it('returns validation errors when source=pasted without response payload', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)->postJson(route('monitors.dry-run', $monitor), [
        'type' => 'status',
        'expression' => 'status == 200',
        'source' => 'pasted',
    ])->assertJsonValidationErrors(['response']);
});
