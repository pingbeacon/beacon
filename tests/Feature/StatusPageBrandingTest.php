<?php

use App\Models\StatusPage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// --- Branding validation ---

test('status page store validates primary_color hex format', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Page',
            'slug' => 'my-page',
            'primary_color' => 'not-a-color',
        ])
        ->assertSessionHasErrors('primary_color');
});

test('status page store accepts valid hex primary_color', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Page',
            'slug' => 'my-page',
            'primary_color' => '#ff5733',
        ])
        ->assertSessionHasNoErrors();

    expect(StatusPage::where('user_id', $user->id)->first()->primary_color)->toBe('#ff5733');
});

test('status page store validates custom_domain uniqueness', function () {
    $user = User::factory()->create();
    StatusPage::factory()->for($user)->create(['custom_domain' => 'status.example.com']);

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'Another Page',
            'slug' => 'another-page',
            'custom_domain' => 'status.example.com',
        ])
        ->assertSessionHasErrors('custom_domain');
});

test('status page update allows same custom_domain on own record', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create([
        'slug' => 'my-page',
        'custom_domain' => 'status.example.com',
    ]);

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'Updated',
            'slug' => 'my-page',
            'custom_domain' => 'status.example.com',
        ])
        ->assertSessionHasNoErrors();
});

test('status page update rejects custom_domain already used by another record', function () {
    $user = User::factory()->create();
    StatusPage::factory()->for($user)->create(['custom_domain' => 'taken.example.com']);
    $statusPage = StatusPage::factory()->for($user)->create(['slug' => 'second-page']);

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'Second',
            'slug' => 'second-page',
            'custom_domain' => 'taken.example.com',
        ])
        ->assertSessionHasErrors('custom_domain');
});

test('status page store validates custom_css max length', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Page',
            'slug' => 'my-page',
            'custom_css' => str_repeat('a', 10241),
        ])
        ->assertSessionHasErrors('custom_css');
});

// --- Branding fields persisted ---

test('status page store persists all branding fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'Branded Page',
            'slug' => 'branded-page',
            'primary_color' => '#3b82f6',
            'background_color' => '#ffffff',
            'text_color' => '#111111',
            'custom_css' => 'body { font-size: 16px; }',
            'header_text' => 'Welcome to our status page',
            'footer_text' => 'Powered by us',
            'custom_domain' => 'status.mybrand.com',
            'show_powered_by' => false,
        ])
        ->assertSessionHasNoErrors();

    $statusPage = StatusPage::where('slug', 'branded-page')->first();

    expect($statusPage->primary_color)->toBe('#3b82f6')
        ->and($statusPage->background_color)->toBe('#ffffff')
        ->and($statusPage->text_color)->toBe('#111111')
        ->and($statusPage->custom_css)->toBe('body { font-size: 16px; }')
        ->and($statusPage->header_text)->toBe('Welcome to our status page')
        ->and($statusPage->footer_text)->toBe('Powered by us')
        ->and($statusPage->custom_domain)->toBe('status.mybrand.com')
        ->and($statusPage->show_powered_by)->toBeFalse();
});

test('status page update persists branding fields', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['slug' => 'my-page']);

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'My Page',
            'slug' => 'my-page',
            'primary_color' => '#ef4444',
            'header_text' => 'All systems operational',
            'show_powered_by' => true,
        ])
        ->assertSessionHasNoErrors();

    $statusPage->refresh();

    expect($statusPage->primary_color)->toBe('#ef4444')
        ->and($statusPage->header_text)->toBe('All systems operational')
        ->and($statusPage->show_powered_by)->toBeTrue();
});

// --- Logo and favicon upload ---

test('status page store uploads logo to public disk', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $logo = UploadedFile::fake()->image('logo.png', 200, 200);

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'Logo Page',
            'slug' => 'logo-page',
            'logo' => $logo,
        ])
        ->assertSessionHasNoErrors();

    $statusPage = StatusPage::where('slug', 'logo-page')->first();

    expect($statusPage->logo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($statusPage->logo_path);
});

test('status page store uploads favicon to public disk', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $favicon = UploadedFile::fake()->image('favicon.png', 32, 32);

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'Favicon Page',
            'slug' => 'favicon-page',
            'favicon' => $favicon,
        ])
        ->assertSessionHasNoErrors();

    $statusPage = StatusPage::where('slug', 'favicon-page')->first();

    expect($statusPage->favicon_path)->not->toBeNull();
    Storage::disk('public')->assertExists($statusPage->favicon_path);
});

test('status page store rejects logo over 2048kb', function () {
    $user = User::factory()->create();
    $oversizedLogo = UploadedFile::fake()->image('logo.png')->size(2049);

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Page',
            'slug' => 'my-page',
            'logo' => $oversizedLogo,
        ])
        ->assertSessionHasErrors('logo');
});

test('status page update uploads new logo to public disk', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['slug' => 'my-page']);
    $logo = UploadedFile::fake()->image('new-logo.png', 200, 200);

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'My Page',
            'slug' => 'my-page',
            'logo' => $logo,
        ])
        ->assertSessionHasNoErrors();

    $statusPage->refresh();

    expect($statusPage->logo_path)->not->toBeNull();
    Storage::disk('public')->assertExists($statusPage->logo_path);
});

// --- Public status page branding data ---

test('public status page returns branding fields', function () {
    $statusPage = StatusPage::factory()->published()->create([
        'primary_color' => '#3b82f6',
        'header_text' => 'System Status',
        'footer_text' => 'Powered by Acme',
        'show_powered_by' => false,
    ]);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('status/show')
            ->where('statusPage.primary_color', '#3b82f6')
            ->where('statusPage.header_text', 'System Status')
            ->where('statusPage.footer_text', 'Powered by Acme')
            ->where('statusPage.show_powered_by', false)
        );
});

test('public status page does not expose custom_domain', function () {
    $statusPage = StatusPage::factory()->published()->create([
        'custom_domain' => 'status.example.com',
    ]);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('status/show')
            ->missing('statusPage.custom_domain')
        );
});
