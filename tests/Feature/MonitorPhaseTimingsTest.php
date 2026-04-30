<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

test('phase-timings endpoint returns avg + p95 per phase across the 24h window', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    // 5 in-window heartbeats with deterministic phase values.
    foreach ([10, 20, 30, 40, 50] as $i => $dns) {
        Heartbeat::factory()->for($monitor)->create([
            'response_time' => 100 + $i * 10,
            'phase_dns_ms' => $dns,
            'phase_tcp_ms' => $dns * 2,
            'phase_tls_ms' => $dns * 3,
            'phase_ttfb_ms' => $dns * 4,
            'phase_transfer_ms' => $dns * 5,
            'created_at' => now()->subMinutes(30 + $i),
        ]);
    }

    // Heartbeat outside the 24h window — must be excluded.
    Heartbeat::factory()->for($monitor)->create([
        'phase_dns_ms' => 9999,
        'phase_tcp_ms' => 9999,
        'phase_tls_ms' => 9999,
        'phase_ttfb_ms' => 9999,
        'phase_transfer_ms' => 9999,
        'created_at' => now()->subDays(2),
    ]);

    $response = $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/phase-timings?period=24h")
        ->assertOk();

    $response->assertJsonPath('period', '24h');
    $response->assertJsonPath('count', 5);

    // avg of 10..50 = 30; p95 picks index floor(0.95 * 5) = 4 → 50.
    $response->assertJsonPath('phases.dns.avg', 30);
    $response->assertJsonPath('phases.dns.p95', 50);
    $response->assertJsonPath('phases.dns.count', 5);

    $response->assertJsonPath('phases.tcp.avg', 60);
    $response->assertJsonPath('phases.tcp.p95', 100);

    $response->assertJsonPath('phases.tls.avg', 90);
    $response->assertJsonPath('phases.transfer.avg', 150);
});

test('phase-timings excludes heartbeats whose phases are null (non-HTTP types)', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    Heartbeat::factory()->for($monitor)->create([
        'phase_dns_ms' => 100,
        'phase_tcp_ms' => 200,
        'phase_tls_ms' => 300,
        'phase_ttfb_ms' => 400,
        'phase_transfer_ms' => 500,
        'created_at' => now()->subMinutes(10),
    ]);

    Heartbeat::factory()->for($monitor)->create([
        'phase_dns_ms' => null,
        'phase_tcp_ms' => null,
        'phase_tls_ms' => null,
        'phase_ttfb_ms' => null,
        'phase_transfer_ms' => null,
        'created_at' => now()->subMinutes(5),
    ]);

    $response = $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/phase-timings?period=24h")
        ->assertOk();

    $response->assertJsonPath('count', 2);
    $response->assertJsonPath('phases.dns.count', 1);
    $response->assertJsonPath('phases.dns.avg', 100);
    $response->assertJsonPath('phases.dns.p95', 100);
});

test('phase-timings returns null avg + p95 when no in-window heartbeats exist', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $response = $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/phase-timings?period=1h")
        ->assertOk();

    $response->assertJsonPath('count', 0);
    $response->assertJsonPath('phases.dns.avg', null);
    $response->assertJsonPath('phases.dns.p95', null);
    $response->assertJsonPath('phases.dns.count', 0);
});

test('phase-timings rejects invalid period values', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/phase-timings?period=99d")
        ->assertStatus(422);
});

test('phase-timings is gated by the monitor view policy', function () {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $monitor = Monitor::factory()->for($owner)->create();

    $this->actingAs($stranger)
        ->getJson("/monitors/{$monitor->id}/phase-timings")
        ->assertForbidden();
});

test('phase-timings respects the 1h window', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    Heartbeat::factory()->for($monitor)->create([
        'phase_dns_ms' => 50,
        'created_at' => now()->subMinutes(10),
    ]);

    Heartbeat::factory()->for($monitor)->create([
        'phase_dns_ms' => 999,
        'created_at' => now()->subHours(2),
    ]);

    $response = $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/phase-timings?period=1h")
        ->assertOk();

    $response->assertJsonPath('count', 1);
    $response->assertJsonPath('phases.dns.avg', 50);
});
