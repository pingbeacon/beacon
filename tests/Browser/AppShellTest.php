<?php

use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('the dashboard renders inside the new shared chrome', function (): void {
    $user = User::factory()->create([
        'name' => 'John Doe',
        'email' => 'john@acme.io',
    ]);

    $this->actingAs($user);

    $page = visit('/dashboard');

    $page->assertSee('Dashboard')
        ->assertSee('John Doe')
        ->assertSee('john@acme.io')
        ->assertSee('Status Pages')
        ->assertSee('Maintenance')
        ->assertSee('Notifications')
        ->assertSee('Settings')
        ->assertSee('beacon · self-hosted · MIT')
        ->assertPresent('[data-slot="app-shell"]')
        ->assertPresent('[data-slot="page-footer"]')
        ->assertPresent('[data-slot="search-trigger"]');
});
