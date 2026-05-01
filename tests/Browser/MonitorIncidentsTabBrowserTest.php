<?php

use App\Enums\IncidentSeverity;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('incidents tab renders summary, heatmap, and a row that expands', function (): void {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'incidents-tab-monitor',
        'is_critical' => true,
    ]);

    Incident::factory()->for($monitor)->resolved()->create([
        'started_at' => now()->subDays(2)->setTime(2, 18),
        'resolved_at' => now()->subDays(2)->setTime(2, 24),
        'cause' => 'HTTP 503 · 3/3 retries failed',
        'severity' => IncidentSeverity::Sev2->value,
    ]);

    Incident::factory()->for($monitor)->create([
        'started_at' => now()->subMinutes(4),
        'cause' => 'connection timeout to billing.acme.io',
        'severity' => IncidentSeverity::Sev1->value,
    ]);

    $this->actingAs($user);

    $page = visit("/monitors/{$monitor->id}?tab=incidents");

    $latest = Incident::query()->latest('id')->firstOrFail();

    $page->assertSee('// incident calendar')
        ->assertSee('6+ incidents/day')
        ->assertSee('connection timeout to billing.acme.io')
        ->assertPresent("[data-testid=\"incident-row-{$latest->id}\"]")
        ->click("[data-testid=\"incident-row-{$latest->id}\"]")
        ->assertPresent("[data-testid=\"incident-detail-{$latest->id}\"]");
});
