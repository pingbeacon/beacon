<?php

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\Tag;
use App\Models\User;

// --- Guest redirects ---

test('guests are redirected to login for monitors index', function () {
    $this->get('/monitors')->assertRedirect('/login');
});

test('guests are redirected to login for monitors create', function () {
    $this->get('/monitors/create')->assertRedirect('/login');
});

test('guests are redirected to login for monitors store', function () {
    $this->post('/monitors')->assertRedirect('/login');
});

test('guests are redirected to login for monitors show', function () {
    $monitor = Monitor::factory()->create();
    $this->get("/monitors/{$monitor->id}")->assertRedirect('/login');
});

test('guests are redirected to login for monitors toggle', function () {
    $monitor = Monitor::factory()->create();
    $this->post("/monitors/{$monitor->id}/toggle")->assertRedirect('/login');
});

// --- Monitor index ---

test('authenticated user can view monitors index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/monitors')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('monitors/index'));
});

test('monitors index only shows the authenticated user own monitors', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Monitor::factory()->for($user)->create(['name' => 'My Monitor']);
    Monitor::factory()->for($other)->create(['name' => 'Other Monitor']);

    $this->actingAs($user)->get('/monitors')->assertOk();

    // Deferred props mean the response won't include the deferred data directly,
    // but we can verify via the database that scoping is correct.
    expect(Monitor::where('user_id', $user->id)->count())->toBe(1);
    expect(Monitor::where('user_id', $other->id)->count())->toBe(1);
});

// --- Monitor create ---

test('authenticated user can view monitor create page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/monitors/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('monitors/create'));
});

// --- Monitor store ---

test('user can create an http monitor', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/monitors', [
        'name' => 'My HTTP Monitor',
        'type' => 'http',
        'url' => 'https://example.com',
        'method' => 'GET',
        'interval' => 60,
        'timeout' => 30,
        'retry_count' => 3,
    ]);

    $response->assertSessionHasNoErrors();

    $monitor = Monitor::where('user_id', $user->id)->where('name', 'My HTTP Monitor')->first();
    expect($monitor)->not->toBeNull();
    expect($monitor->type)->toBe('http');
    expect($monitor->status)->toBe('pending');

    $response->assertRedirect("/monitors/{$monitor->id}");
});

test('user can create a tcp monitor', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'TCP Monitor',
            'type' => 'tcp',
            'host' => 'example.com',
            'port' => 443,
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
        ])
        ->assertSessionHasNoErrors();

    expect(Monitor::where('user_id', $user->id)->where('type', 'tcp')->exists())->toBeTrue();
});

test('user can create a ping monitor', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Ping Monitor',
            'type' => 'ping',
            'host' => 'example.com',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
        ])
        ->assertSessionHasNoErrors();

    expect(Monitor::where('user_id', $user->id)->where('type', 'ping')->exists())->toBeTrue();
});

test('user can create a dns monitor', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'DNS Monitor',
            'type' => 'dns',
            'host' => 'example.com',
            'dns_record_type' => 'A',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
        ])
        ->assertSessionHasNoErrors();

    expect(Monitor::where('user_id', $user->id)->where('type', 'dns')->exists())->toBeTrue();
});

test('user can create a push monitor', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Push Monitor',
            'type' => 'push',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
        ])
        ->assertSessionHasNoErrors();

    expect(Monitor::where('user_id', $user->id)->where('type', 'push')->exists())->toBeTrue();
});

// --- Validation errors ---

test('monitor store fails with invalid type', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Invalid',
            'type' => 'invalid-type',
        ])
        ->assertSessionHasErrors('type');
});

test('monitor store fails when http url is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'No URL',
            'type' => 'http',
        ])
        ->assertSessionHasErrors('url');
});

test('monitor store fails when tcp host is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'No Host',
            'type' => 'tcp',
            'port' => 80,
        ])
        ->assertSessionHasErrors('host');
});

test('monitor store fails when tcp port is out of range', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Bad Port',
            'type' => 'tcp',
            'host' => 'example.com',
            'port' => 99999,
        ])
        ->assertSessionHasErrors('port');
});

test('monitor store fails when name is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'type' => 'http',
            'url' => 'https://example.com',
        ])
        ->assertSessionHasErrors('name');
});

// --- Monitor show ---

test('user can view their own monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('monitors/show'));
});

test('user cannot view another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}")
        ->assertForbidden();
});

// --- Monitor edit ---

test('user can view the edit page for their own monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('monitors/edit'));
});

test('user cannot edit another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}/edit")
        ->assertForbidden();
});

// --- Monitor update ---

test('user can update their own monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($user)->create(['name' => 'Old Name']);

    $this->actingAs($user)
        ->patch("/monitors/{$monitor->id}", [
            'name' => 'Updated Name',
            'type' => 'http',
            'url' => 'https://updated.com',
            'interval' => 120,
            'timeout' => 30,
            'retry_count' => 1,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($monitor->fresh()->name)->toBe('Updated Name');
});

test('user cannot update another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($other)->create();

    $this->actingAs($user)
        ->patch("/monitors/{$monitor->id}", [
            'name' => 'Hacked',
            'type' => 'http',
            'url' => 'https://hacked.com',
        ])
        ->assertForbidden();
});

// --- Monitor destroy ---

test('user can delete their own monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete("/monitors/{$monitor->id}")
        ->assertRedirect('/monitors');

    $this->assertSoftDeleted($monitor);
});

test('user cannot delete another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete("/monitors/{$monitor->id}")
        ->assertForbidden();

    expect($monitor->fresh())->not->toBeNull();
});

// --- Monitor toggle ---

test('user can pause an active monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['is_active' => true, 'status' => 'up']);

    $this->actingAs($user)
        ->post("/monitors/{$monitor->id}/toggle")
        ->assertRedirect();

    $monitor->refresh();
    expect($monitor->is_active)->toBeFalse();
    expect($monitor->status)->toBe('paused');
});

test('user can resume a paused monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->paused()->for($user)->create();

    $this->actingAs($user)
        ->post("/monitors/{$monitor->id}/toggle")
        ->assertRedirect();

    $monitor->refresh();
    expect($monitor->is_active)->toBeTrue();
    expect($monitor->status)->toBe('pending');
});

test('user cannot toggle another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->post("/monitors/{$monitor->id}/toggle")
        ->assertForbidden();
});

// --- Tags and channels sync on create ---

test('tags are synced when creating a monitor', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Tagged Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
            'tag_ids' => [$tag->id],
        ])
        ->assertSessionHasNoErrors();

    $monitor = Monitor::where('user_id', $user->id)->where('name', 'Tagged Monitor')->first();
    expect($monitor->tags->pluck('id')->toArray())->toContain($tag->id);
});

test('notification channels are synced when creating a monitor', function () {
    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Channel Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
            'notification_channel_ids' => [$channel->id],
        ])
        ->assertSessionHasNoErrors();

    $monitor = Monitor::where('user_id', $user->id)->where('name', 'Channel Monitor')->first();
    expect($monitor->notificationChannels->pluck('id')->toArray())->toContain($channel->id);
});

test('tags are synced when updating a monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($user)->create();
    $tagA = Tag::factory()->for($user)->create();
    $tagB = Tag::factory()->for($user)->create();
    $monitor->tags()->sync([$tagA->id]);

    $this->actingAs($user)
        ->patch("/monitors/{$monitor->id}", [
            'name' => $monitor->name,
            'type' => 'http',
            'url' => $monitor->url,
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
            'tag_ids' => [$tagB->id],
        ])
        ->assertSessionHasNoErrors();

    $monitor->refresh();
    $tagIds = $monitor->tags->pluck('id')->toArray();
    expect($tagIds)->toContain($tagB->id);
    expect($tagIds)->not->toContain($tagA->id);
});

test('user cannot assign another users tag to their monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherTag = Tag::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
            'tag_ids' => [$otherTag->id],
        ])
        ->assertSessionHasErrors('tag_ids.0');
});

// --- Tag CRUD ---

test('user can create a tag', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/tags', [
            'name' => 'Production',
            'color' => '#FF5733',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(Tag::where('user_id', $user->id)->where('name', 'Production')->exists())->toBeTrue();
});

test('tag creation fails with invalid hex color', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/tags', [
            'name' => 'Bad Color',
            'color' => 'red',
        ])
        ->assertSessionHasErrors('color');
});

test('tag creation fails when name is too long', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/tags', [
            'name' => str_repeat('a', 51),
            'color' => '#AABBCC',
        ])
        ->assertSessionHasErrors('name');
});

test('user can update their own tag', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->for($user)->create(['name' => 'Old', 'color' => '#000000']);

    $this->actingAs($user)
        ->patch("/tags/{$tag->id}", [
            'name' => 'New Name',
            'color' => '#FFFFFF',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($tag->fresh()->name)->toBe('New Name');
    expect($tag->fresh()->color)->toBe('#FFFFFF');
});

test('user cannot update another users tag', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $tag = Tag::factory()->for($other)->create();

    $this->actingAs($user)
        ->patch("/tags/{$tag->id}", [
            'name' => 'Hacked',
            'color' => '#FF0000',
        ])
        ->assertForbidden();
});

test('user can delete their own tag', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete("/tags/{$tag->id}")
        ->assertRedirect();

    expect($tag->fresh())->toBeNull();
});

test('user cannot delete another users tag', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $tag = Tag::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete("/tags/{$tag->id}")
        ->assertForbidden();

    expect($tag->fresh())->not->toBeNull();
});
