<?php

use App\Models\Monitor;
use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('a user can create a monitor through the wizard happy path', function (): void {
    $user = User::factory()->create([
        'name' => 'Wizard User',
        'email' => 'wizard@acme.io',
    ]);

    $this->actingAs($user);

    $page = visit('/monitors/create');

    $page->assertSee('New monitor')
        ->assertSee('Type')
        ->assertSee('Target')
        ->assertSee('Schedule')
        ->assertSee('Assertions')
        ->assertSee('Alerts');

    // Type step is preselected to HTTP — advance to target
    $page->click('button:has-text("Continue →")')
        ->fill('input[placeholder="My Website"]', 'wizard.acme.io')
        ->fill('input[placeholder="https://example.com"]', 'https://wizard.acme.io/health')
        ->click('button:has-text("Continue →")');

    // Schedule step renders the preview card
    $page->assertPresent('[data-slot="schedule-preview"]')
        ->click('button:has-text("Continue →")');

    // Assertions step renders the test-now panel
    $page->assertPresent('[data-slot="test-now"]')
        ->click('button:has-text("Continue →")');

    $page->click('button:has-text("Create monitor")');

    expect(Monitor::query()->where('user_id', $user->id)->where('name', 'wizard.acme.io')->exists())
        ->toBeTrue();

    $monitor = Monitor::query()->where('name', 'wizard.acme.io')->firstOrFail();
    $page->assertPathIs("/monitors/{$monitor->id}");
});
