<?php

use App\Models\Monitor;
use App\Models\User;

test('dashboard deferred monitors include all team monitors with their status', function () {
    $user = User::factory()->create();
    Monitor::factory()->up()->create(['user_id' => $user->id]);
    Monitor::factory()->up()->create(['user_id' => $user->id]);
    Monitor::factory()->down()->create(['user_id' => $user->id]);
    Monitor::factory()->paused()->create(['user_id' => $user->id]);

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->loadDeferredProps('default', fn ($page) => $page
                ->has('monitors', 4)
                ->where('monitors', fn ($monitors) => collect($monitors)
                    ->countBy('status')
                    ->all() === ['up' => 2, 'down' => 1, 'paused' => 1])
            )
        );
});

test('dashboard renders for user with no monitors', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->loadDeferredProps('default', fn ($page) => $page->has('monitors', 0))
        );
});

test('dashboard only shows monitors for authenticated user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Monitor::factory()->up()->count(3)->create(['user_id' => $user->id]);
    Monitor::factory()->up()->count(5)->create(['user_id' => $otherUser->id]);

    $this->actingAs($user)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->loadDeferredProps('default', fn ($page) => $page->has('monitors', 3))
        );
});
