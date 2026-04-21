<?php

use App\Models\Monitor;
use App\Models\User;

test('user can view trashed monitors page', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $monitor->delete();

    $this->actingAs($user)
        ->get('/monitors-trashed')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('monitors/trashed')
            ->has('monitors', 1)
        );
});

test('trashed page only shows own deleted monitors', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $ownMonitor = Monitor::factory()->for($user)->create();
    $ownMonitor->delete();

    $otherMonitor = Monitor::factory()->for($other)->create();
    $otherMonitor->delete();

    $this->actingAs($user)
        ->get('/monitors-trashed')
        ->assertInertia(fn ($page) => $page
            ->has('monitors', 1)
        );
});

test('user can restore a soft-deleted monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $monitor->delete();

    $this->assertSoftDeleted($monitor);

    $this->actingAs($user)
        ->post("/monitors/{$monitor->id}/restore")
        ->assertRedirect("/monitors/{$monitor->id}");

    $this->assertNotSoftDeleted($monitor);
});

test('user cannot restore another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();
    $monitor->delete();

    $this->actingAs($user)
        ->post("/monitors/{$monitor->id}/restore")
        ->assertForbidden();

    $this->assertSoftDeleted($monitor);
});

test('user can permanently delete a trashed monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $monitor->delete();

    $this->actingAs($user)
        ->delete("/monitors/{$monitor->id}/force-delete")
        ->assertRedirect('/monitors-trashed');

    expect(Monitor::withTrashed()->find($monitor->id))->toBeNull();
});

test('user cannot permanently delete another users monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();
    $monitor->delete();

    $this->actingAs($user)
        ->delete("/monitors/{$monitor->id}/force-delete")
        ->assertForbidden();

    expect(Monitor::withTrashed()->find($monitor->id))->not->toBeNull();
});

test('monitors index shows trashed count', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();
    $monitor->delete();

    $this->actingAs($user)
        ->get('/monitors')
        ->assertInertia(fn ($page) => $page
            ->where('trashedCount', 1)
        );
});
