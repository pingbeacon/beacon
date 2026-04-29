<?php

use App\Models\User;

// --- Guest access ---

test('guests cannot view api tokens page', function () {
    $this->get('/settings/api-tokens')->assertRedirect('/login');
});

test('guests cannot create api tokens', function () {
    $this->post('/settings/api-tokens')->assertRedirect('/login');
});

test('guests cannot delete api tokens', function () {
    $this->delete('/settings/api-tokens/1')->assertRedirect('/login');
});

// --- View page ---

test('authenticated user can view api tokens page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/settings/api-tokens')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/api-tokens'));
});

test('api tokens page shows existing tokens', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    $user->createToken('My Token', ["team:{$teamId}", 'monitors:read']);

    $this->actingAs($user)
        ->get('/settings/api-tokens')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/api-tokens')
            ->has('tokens', 1)
            ->where('tokens.0.name', 'My Token')
        );
});

// --- Create token ---

test('user can create a token with valid data', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    $this->actingAs($user)
        ->post('/settings/api-tokens', [
            'name' => 'CI Token',
            'team_id' => $teamId,
            'scopes' => ['monitors:read'],
            'expires_at' => null,
        ])
        ->assertRedirect('/settings/api-tokens');

    expect($user->tokens()->count())->toBe(1);
    expect($user->tokens()->first()->name)->toBe('CI Token');
});

test('token contains team ability', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    $this->actingAs($user)->post('/settings/api-tokens', [
        'name' => 'Test',
        'team_id' => $teamId,
        'scopes' => ['monitors:read'],
        'expires_at' => null,
    ]);

    $abilities = $user->tokens()->first()->abilities;

    expect($abilities)->toContain("team:{$teamId}");
    expect($abilities)->toContain('monitors:read');
});

test('token creation fails with invalid expiry', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/settings/api-tokens', [
            'name' => 'Bad Expiry',
            'team_id' => $user->current_team_id,
            'scopes' => ['monitors:read'],
            'expires_at' => 'tomorrow',
        ])
        ->assertSessionHasErrors('expires_at');
});

test('token can be created with expiry', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    $this->actingAs($user)->post('/settings/api-tokens', [
        'name' => 'Expiring Token',
        'team_id' => $teamId,
        'scopes' => ['monitors:read'],
        'expires_at' => '30d',
    ]);

    expect($user->tokens()->first()->expires_at)->not->toBeNull();
});

test('token creation fails with invalid scope', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/settings/api-tokens', [
            'name' => 'Bad Token',
            'team_id' => $user->current_team_id,
            'scopes' => ['invalid:scope'],
            'expires_at' => null,
        ])
        ->assertSessionHasErrors('scopes.0');
});

test('token creation fails when name is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/settings/api-tokens', [
            'name' => '',
            'team_id' => $user->current_team_id,
            'scopes' => ['monitors:read'],
            'expires_at' => null,
        ])
        ->assertSessionHasErrors('name');
});

test('user cannot create token for team they do not belong to', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)
        ->post('/settings/api-tokens', [
            'name' => 'Sneaky Token',
            'team_id' => $other->current_team_id,
            'scopes' => ['monitors:read'],
            'expires_at' => null,
        ])
        ->assertForbidden();
});

test('token limit of 10 per team is enforced', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    for ($i = 0; $i < 10; $i++) {
        $user->createToken("Token {$i}", ["team:{$teamId}", 'monitors:read']);
    }

    $this->actingAs($user)
        ->post('/settings/api-tokens', [
            'name' => 'Over Limit',
            'team_id' => $teamId,
            'scopes' => ['monitors:read'],
            'expires_at' => null,
        ])
        ->assertSessionHasErrors('team_id');
});

// --- Delete token ---

test('user can revoke their own token', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    $user->createToken('Doomed Token', ["team:{$teamId}", 'monitors:read']);
    $tokenId = $user->tokens()->first()->id;

    $this->actingAs($user)
        ->delete("/settings/api-tokens/{$tokenId}")
        ->assertRedirect('/settings/api-tokens');

    expect($user->tokens()->count())->toBe(0);
});

test('user cannot revoke another users token', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $other->createToken('Their Token', ["team:{$other->current_team_id}", 'monitors:read']);
    $tokenId = $other->tokens()->first()->id;

    $this->actingAs($user)
        ->delete("/settings/api-tokens/{$tokenId}")
        ->assertForbidden();

    expect($other->tokens()->count())->toBe(1);
});

test('user can revoke all tokens', function () {
    $user = User::factory()->create();
    $teamId = $user->current_team_id;

    $user->createToken('Token 1', ["team:{$teamId}", 'monitors:read']);
    $user->createToken('Token 2', ["team:{$teamId}", 'monitors:write']);

    $this->actingAs($user)
        ->delete('/settings/api-tokens/all')
        ->assertRedirect('/settings/api-tokens');

    expect($user->tokens()->count())->toBe(0);
});
