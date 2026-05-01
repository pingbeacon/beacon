<?php

use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\SslCertificate;
use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('overview tab renders all panels for a seeded http monitor', function (): void {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'overview-tab-monitor',
        'type' => 'http',
        'url' => 'https://billing.acme.io',
        'ssl_monitoring_enabled' => true,
    ]);

    foreach (range(0, 30) as $i) {
        Heartbeat::factory()->for($monitor)->create([
            'status' => 'up',
            'status_code' => 200,
            'response_time' => 200 + ($i % 7) * 80,
            'created_at' => now()->subMinutes($i * 5),
        ]);
    }

    SslCertificate::factory()->for($monitor)->create([
        'issuer' => "Let's Encrypt R11",
        'subject' => '*.acme.io',
        'is_valid' => true,
        'days_until_expiry' => 67,
    ]);

    Incident::factory()->for($monitor)->resolved()->create([
        'started_at' => now()->subDay()->setTime(2, 18),
        'resolved_at' => now()->subDay()->setTime(2, 24),
        'cause' => 'HTTP 503 · 3/3 retries failed',
    ]);

    $this->actingAs($user);

    $page = visit("/monitors/{$monitor->id}?tab=overview");

    $page->assertPresent('[data-slot="overview-uptime"]')
        ->assertPresent('[data-slot="overview-response"]')
        ->assertPresent('[data-slot="overview-distribution"]')
        ->assertPresent('[data-slot="overview-ssl"]')
        ->assertPresent('[data-slot="overview-incidents"]')
        ->assertPresent('[data-slot="overview-live-log"]');

    // Eyebrow primitive renders "// " via CSS ::before, so the visible
    // text in the DOM is just the lowercase label.
    $page->assertSee('uptime tracker')
        ->assertSee('response time')
        ->assertSee('response distribution')
        ->assertSee('ssl certificate')
        ->assertSee('recent incidents')
        ->assertSee('live log');

    $page->assertPresent('[data-slot="status-pill"]')
        ->assertPresent('[data-slot="terminal"]');

    $page->assertSee('P50')
        ->assertSee('P90')
        ->assertSee('P95')
        ->assertSee('P99');
});

test('overview tab renders structurally even with no heartbeats or ssl', function (): void {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'empty-overview-monitor',
        'type' => 'http',
        'ssl_monitoring_enabled' => false,
    ]);

    $this->actingAs($user);

    $page = visit("/monitors/{$monitor->id}?tab=overview");

    $page->assertPresent('[data-slot="overview-uptime"]')
        ->assertPresent('[data-slot="overview-response"]')
        ->assertPresent('[data-slot="overview-distribution"]')
        ->assertPresent('[data-slot="overview-incidents"]')
        ->assertPresent('[data-slot="overview-live-log"]');
});
