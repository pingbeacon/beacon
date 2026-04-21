<?php

use App\Models\Monitor;
use App\Models\User;

// --- Bulk Pause ---

test('user can bulk pause monitors', function () {
    $user = User::factory()->create();
    $monitors = Monitor::factory()->for($user)->up()->count(3)->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/pause', [
            'monitor_ids' => $monitors->pluck('id')->toArray(),
        ])
        ->assertRedirect();

    foreach ($monitors as $monitor) {
        $monitor->refresh();
        expect($monitor->is_active)->toBeFalse();
        expect($monitor->status)->toBe('paused');
    }
});

// --- Bulk Resume ---

test('user can bulk resume monitors', function () {
    $user = User::factory()->create();
    $monitors = Monitor::factory()->for($user)->paused()->count(3)->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/resume', [
            'monitor_ids' => $monitors->pluck('id')->toArray(),
        ])
        ->assertRedirect();

    foreach ($monitors as $monitor) {
        $monitor->refresh();
        expect($monitor->is_active)->toBeTrue();
        expect($monitor->status)->toBe('pending');
    }
});

// --- Bulk Delete ---

test('user can bulk delete monitors', function () {
    $user = User::factory()->create();
    $monitors = Monitor::factory()->for($user)->count(3)->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/delete', [
            'monitor_ids' => $monitors->pluck('id')->toArray(),
        ])
        ->assertRedirect();

    foreach ($monitors as $monitor) {
        $this->assertSoftDeleted($monitor);
    }
});

// --- User scoping ---

test('user cannot bulk pause another users monitors', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->up()->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/pause', [
            'monitor_ids' => [$monitor->id],
        ])
        ->assertSessionHasErrors('monitor_ids.0');
});

test('user cannot bulk delete another users monitors', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/delete', [
            'monitor_ids' => [$monitor->id],
        ])
        ->assertSessionHasErrors('monitor_ids.0');
});

// --- Validation ---

test('bulk action fails with empty array', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/pause', [
            'monitor_ids' => [],
        ])
        ->assertSessionHasErrors('monitor_ids');
});

test('bulk action fails without monitor_ids', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/pause', [])
        ->assertSessionHasErrors('monitor_ids');
});

// --- Mixed ownership ---

test('bulk action with mixed ownership rejects invalid monitors', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $ownMonitor = Monitor::factory()->for($user)->create();
    $otherMonitor = Monitor::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/monitors/bulk/pause', [
            'monitor_ids' => [$ownMonitor->id, $otherMonitor->id],
        ])
        ->assertSessionHasErrors('monitor_ids.1');
});
