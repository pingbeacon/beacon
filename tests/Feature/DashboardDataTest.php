<?php

use App\Models\Monitor;
use App\Models\User;

test('dashboard returns monitor counts', function () {
    $user = User::factory()->create();
    Monitor::factory()->up()->create(['user_id' => $user->id]);
    Monitor::factory()->up()->create(['user_id' => $user->id]);
    Monitor::factory()->down()->create(['user_id' => $user->id]);
    Monitor::factory()->paused()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('counts.total', 4)
            ->where('counts.up', 2)
            ->where('counts.down', 1)
            ->where('counts.paused', 1)
        );
});

test('dashboard shows zero counts for user with no monitors', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('counts.total', 0)
        );
});

test('dashboard only shows monitors for authenticated user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Monitor::factory()->up()->count(3)->create(['user_id' => $user->id]);
    Monitor::factory()->up()->count(5)->create(['user_id' => $otherUser->id]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('counts.total', 3)
        );
});
