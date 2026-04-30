<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('search narrows the visible monitors list', function (): void {
    $user = User::factory()->create();

    $alpha = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'alpha-api',
        'url' => 'https://alpha.example.com',
    ]);
    $beta = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'beta-billing',
        'url' => 'https://beta.example.com',
    ]);

    Heartbeat::factory()->count(5)->for($alpha)->create(['status' => 'up', 'response_time' => 110]);
    Heartbeat::factory()->count(5)->for($beta)->create(['status' => 'up', 'response_time' => 120]);

    $this->actingAs($user);

    $page = visit('/monitors');

    $page->assertPresent("[data-testid=\"monitor-row-{$alpha->id}\"]")
        ->assertPresent("[data-testid=\"monitor-row-{$beta->id}\"]");

    $page->fill('[data-testid="monitors-header-search"] input', 'alpha-api');

    $page->assertPresent("[data-testid=\"monitor-row-{$alpha->id}\"]")
        ->assertNotPresent("[data-testid=\"monitor-row-{$beta->id}\"]");
});

test('status filter narrows the visible monitors list', function (): void {
    $user = User::factory()->create();

    $up = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'up-monitor',
    ]);
    $down = Monitor::factory()->down()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'down-monitor',
    ]);

    Heartbeat::factory()->count(5)->for($up)->create(['status' => 'up', 'response_time' => 110]);
    Heartbeat::factory()->count(5)->for($down)->create(['status' => 'down', 'response_time' => null]);

    $this->actingAs($user);

    $page = visit('/monitors');

    $page->assertPresent("[data-testid=\"monitor-row-{$up->id}\"]")
        ->assertPresent("[data-testid=\"monitor-row-{$down->id}\"]");

    $page->click('button[aria-label^="Down "]');

    $page->assertPresent("[data-testid=\"monitor-row-{$down->id}\"]")
        ->assertNotPresent("[data-testid=\"monitor-row-{$up->id}\"]");
});
