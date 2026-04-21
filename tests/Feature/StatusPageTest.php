<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\StatusPage;
use App\Models\User;

// --- Guest redirects ---

test('guests are redirected to login for status pages index', function () {
    $this->get('/status-pages')->assertRedirect('/login');
});

test('guests are redirected to login for status pages create', function () {
    $this->get('/status-pages/create')->assertRedirect('/login');
});

test('guests are redirected to login for status pages store', function () {
    $this->post('/status-pages')->assertRedirect('/login');
});

test('guests are redirected to login for status pages edit', function () {
    $statusPage = StatusPage::factory()->create();
    $this->get("/status-pages/{$statusPage->id}/edit")->assertRedirect('/login');
});

test('guests are redirected to login for status pages update', function () {
    $statusPage = StatusPage::factory()->create();
    $this->put("/status-pages/{$statusPage->id}")->assertRedirect('/login');
});

test('guests are redirected to login for status pages destroy', function () {
    $statusPage = StatusPage::factory()->create();
    $this->delete("/status-pages/{$statusPage->id}")->assertRedirect('/login');
});

// --- Status pages index ---

test('authenticated user can view status pages index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/status-pages')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('status-pages/index'));
});

test('status pages index only shows the authenticated users status pages', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    StatusPage::factory()->for($user)->create(['title' => 'My Page']);
    StatusPage::factory()->for($other)->create(['title' => 'Other Page']);

    $this->actingAs($user)
        ->get('/status-pages')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('status-pages/index')
            ->has('statusPages', 1)
            ->where('statusPages.0.title', 'My Page')
        );
});

// --- Status pages create ---

test('authenticated user can view status pages create page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/status-pages/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('status-pages/create'));
});

// --- Status pages store ---

test('user can create a status page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Status Page',
            'slug' => 'my-status-page',
            'description' => 'Our services status.',
            'is_published' => false,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/status-pages');

    expect(StatusPage::where('user_id', $user->id)->where('slug', 'my-status-page')->exists())->toBeTrue();
});

test('user can create a status page with monitors', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Status Page',
            'slug' => 'my-status-page',
            'monitor_ids' => [$monitor->id],
        ])
        ->assertSessionHasNoErrors();

    $statusPage = StatusPage::where('user_id', $user->id)->first();
    expect($statusPage->monitors->pluck('id')->toArray())->toContain($monitor->id);
});

test('user cannot assign another users monitor to their status page', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherMonitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Page',
            'slug' => 'my-page',
            'monitor_ids' => [$otherMonitor->id],
        ])
        ->assertSessionHasErrors('monitor_ids.0');
});

test('status page store fails when title is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', ['slug' => 'my-page'])
        ->assertSessionHasErrors('title');
});

test('status page store fails when slug is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', ['title' => 'My Page'])
        ->assertSessionHasErrors('slug');
});

test('status page store fails with duplicate slug', function () {
    $user = User::factory()->create();
    StatusPage::factory()->for($user)->create(['slug' => 'existing-slug']);

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'Another Page',
            'slug' => 'existing-slug',
        ])
        ->assertSessionHasErrors('slug');
});

test('status page store fails with invalid slug characters', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/status-pages', [
            'title' => 'My Page',
            'slug' => 'invalid slug!',
        ])
        ->assertSessionHasErrors('slug');
});

// --- Status pages edit ---

test('user can view the edit page for their own status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/status-pages/{$statusPage->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('status-pages/edit'));
});

test('user cannot edit another users status page', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $statusPage = StatusPage::factory()->for($other)->create();

    $this->actingAs($user)
        ->get("/status-pages/{$statusPage->id}/edit")
        ->assertForbidden();
});

// --- Status pages update ---

test('user can update their own status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['title' => 'Old Title', 'slug' => 'old-slug']);

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'New Title',
            'slug' => 'new-slug',
            'is_published' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $statusPage->refresh();
    expect($statusPage->title)->toBe('New Title');
    expect($statusPage->slug)->toBe('new-slug');
    expect($statusPage->is_published)->toBeTrue();
});

test('user can update status page slug to the same value', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['slug' => 'my-page']);

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'Updated Title',
            'slug' => 'my-page',
        ])
        ->assertSessionHasNoErrors();
});

test('user cannot update another users status page', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $statusPage = StatusPage::factory()->for($other)->create();

    $this->actingAs($user)
        ->put("/status-pages/{$statusPage->id}", [
            'title' => 'Hacked',
            'slug' => 'hacked',
        ])
        ->assertForbidden();
});

// --- Status pages destroy ---

test('user can delete their own status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete("/status-pages/{$statusPage->id}")
        ->assertRedirect('/status-pages');

    expect($statusPage->fresh())->toBeNull();
});

test('user cannot delete another users status page', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $statusPage = StatusPage::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete("/status-pages/{$statusPage->id}")
        ->assertForbidden();

    expect($statusPage->fresh())->not->toBeNull();
});

// --- Public status page ---

test('public status page is accessible without authentication', function () {
    $statusPage = StatusPage::factory()->published()->create();

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('status/show'));
});

test('unpublished status page returns 404 for public access', function () {
    $statusPage = StatusPage::factory()->create(['is_published' => false]);

    $this->get("/status/{$statusPage->slug}")->assertNotFound();
});

test('public status page returns 404 for unknown slug', function () {
    $this->get('/status/nonexistent-slug')->assertNotFound();
});

test('public status page shows monitor data', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->up()->create(['name' => 'My API']);
    $statusPage = StatusPage::factory()->for($user)->published()->create();
    $statusPage->monitors()->attach($monitor->id, ['sort_order' => 0]);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('status/show')
            ->has('monitors', 1)
            ->where('monitors.0.name', 'My API')
        );
});

// --- Overall status calculation ---

test('overall status is operational when all monitors are up', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->published()->create();

    $monitorA = Monitor::factory()->for($user)->up()->create();
    $monitorB = Monitor::factory()->for($user)->up()->create();
    $statusPage->monitors()->attach([
        $monitorA->id => ['sort_order' => 0],
        $monitorB->id => ['sort_order' => 1],
    ]);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('overallStatus', 'operational'));
});

test('overall status is major_outage when all monitors are down', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->published()->create();

    $monitorA = Monitor::factory()->for($user)->down()->create();
    $monitorB = Monitor::factory()->for($user)->down()->create();
    $statusPage->monitors()->attach([
        $monitorA->id => ['sort_order' => 0],
        $monitorB->id => ['sort_order' => 1],
    ]);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('overallStatus', 'major_outage'));
});

test('overall status is degraded when some monitors are down', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->published()->create();

    $monitorUp = Monitor::factory()->for($user)->up()->create();
    $monitorDown = Monitor::factory()->for($user)->down()->create();
    $statusPage->monitors()->attach([
        $monitorUp->id => ['sort_order' => 0],
        $monitorDown->id => ['sort_order' => 1],
    ]);

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('overallStatus', 'degraded'));
});

test('overall status is operational when status page has no monitors', function () {
    $statusPage = StatusPage::factory()->published()->create();

    $this->get("/status/{$statusPage->slug}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('overallStatus', 'operational'));
});

// --- Push heartbeat endpoint ---

test('valid push token creates a heartbeat and returns 200', function () {
    $monitor = Monitor::factory()->push()->up()->create();

    $this->postJson("/api/push/{$monitor->push_token}")
        ->assertOk()
        ->assertJson(['ok' => true]);

    expect(Heartbeat::where('monitor_id', $monitor->id)->where('status', 'up')->exists())->toBeTrue();
});

test('push heartbeat updates monitor status from down to up', function () {
    $monitor = Monitor::factory()->push()->down()->create();

    $this->postJson("/api/push/{$monitor->push_token}")->assertOk();

    expect($monitor->fresh()->status)->toBe('up');
});

test('push endpoint returns 404 for invalid token', function () {
    $this->postJson('/api/push/invalid-token-that-does-not-exist')->assertNotFound();
});

test('push endpoint returns 404 for non-push monitor type', function () {
    $monitor = Monitor::factory()->http()->create(['push_token' => 'some-token-for-http']);

    $this->postJson('/api/push/some-token-for-http')->assertNotFound();
});

test('push endpoint returns 404 for inactive monitor', function () {
    $monitor = Monitor::factory()->push()->paused()->create();

    $this->postJson("/api/push/{$monitor->push_token}")->assertNotFound();
});
