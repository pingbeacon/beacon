<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('response tab renders all sections for a seeded http monitor', function (): void {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'response-tab-monitor',
    ]);

    // Current 24h window.
    foreach (range(0, 30) as $i) {
        Heartbeat::factory()->for($monitor)->create([
            'status' => 'up',
            'status_code' => 200,
            'response_time' => 200 + ($i % 7) * 80,
            'phase_dns_ms' => 12 + ($i % 4),
            'phase_tcp_ms' => 22 + ($i % 5),
            'phase_tls_ms' => 80 + ($i % 6),
            'phase_ttfb_ms' => 130 + ($i % 11) * 10,
            'phase_transfer_ms' => 25 + ($i % 3),
            'created_at' => now()->subMinutes($i * 10),
        ]);
    }

    // Previous 24h window so the compare ghost line has data to draw.
    foreach (range(0, 30) as $i) {
        Heartbeat::factory()->for($monitor)->create([
            'status' => 'up',
            'status_code' => 200,
            'response_time' => 220 + ($i % 6) * 70,
            'created_at' => now()->subDay()->subMinutes($i * 10),
        ]);
    }

    $this->actingAs($user);

    $page = visit("/monitors/{$monitor->id}?tab=response");

    $page->assertPresent('[data-slot="response-chart"]')
        ->assertPresent('[data-slot="distribution-histogram"]')
        ->assertPresent('[data-slot="phase-waterfall"]')
        ->assertPresent('[data-slot="status-codes"]')
        ->assertPresent('[data-slot="assertion-timeline"]')
        ->assertPresent('[data-slot="slowest-checks"]');

    $page->assertPresent('[data-phase="dns"]')
        ->assertPresent('[data-phase="ttfb"]')
        ->assertPresent('[data-phase="transfer"]');

    $page->assertPresent('[data-slot="prev-period-line"]');
});
