<?php

use App\Models\Monitor;
use App\Models\User;

function makeToken(User $user, array $scopes = ['monitors:read', 'monitors:write']): string
{
    $teamId = $user->current_team_id;
    $token = $user->createToken('Test Token', array_merge(["team:{$teamId}"], $scopes));

    return $token->plainTextToken;
}

// --- Unauthenticated ---

test('unauthenticated request returns 401', function () {
    $this->getJson('/api/v1/monitors')->assertUnauthorized();
});

// --- Missing scope ---

test('token without monitors:read cannot list monitors', function () {
    $user = User::factory()->create();
    $token = $user->createToken('No Scope', ["team:{$user->current_team_id}"]);

    $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/monitors')
        ->assertForbidden();
});

// --- List monitors ---

test('authenticated user can list monitors', function () {
    $user = User::factory()->create();
    Monitor::factory()->for($user)->count(3)->create(['team_id' => $user->current_team_id]);

    $this->withToken(makeToken($user))
        ->getJson('/api/v1/monitors')
        ->assertOk()
        ->assertJsonStructure(['data', 'meta'])
        ->assertJsonCount(3, 'data');
});

test('monitors are scoped to token team', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id, 'name' => 'Mine']);
    Monitor::factory()->for($other)->create(['team_id' => $other->current_team_id, 'name' => 'Theirs']);

    $this->withToken(makeToken($user))
        ->getJson('/api/v1/monitors')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Mine');
});

test('push_token is not exposed in api response', function () {
    $user = User::factory()->create();
    Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $response = $this->withToken(makeToken($user))
        ->getJson('/api/v1/monitors')
        ->assertOk();

    expect($response->json('data.0'))->not->toHaveKey('push_token');
});

// --- Show monitor ---

test('user can fetch a single monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $this->withToken(makeToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $monitor->id);
});

test('user cannot fetch another teams monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create(['team_id' => $other->current_team_id]);

    $this->withToken(makeToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}")
        ->assertForbidden();
});

// --- Create monitor ---

test('user can create a monitor with write scope', function () {
    $user = User::factory()->create();

    $this->withToken(makeToken($user))
        ->postJson('/api/v1/monitors', [
            'name' => 'New Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'New Monitor');

    expect(Monitor::query()->where('team_id', $user->current_team_id)->count())->toBe(1);
});

test('token with only monitors:read cannot create a monitor', function () {
    $user = User::factory()->create();
    $token = $user->createToken('Read Only', ["team:{$user->current_team_id}", 'monitors:read']);

    $this->withToken($token->plainTextToken)
        ->postJson('/api/v1/monitors', [
            'name' => 'Sneaky Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
        ])
        ->assertForbidden();
});

test('monitor creation validates required fields', function () {
    $user = User::factory()->create();

    $this->withToken(makeToken($user))
        ->postJson('/api/v1/monitors', [])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_error');
});

// --- Update monitor ---

test('user can update their monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $this->withToken(makeToken($user))
        ->putJson("/api/v1/monitors/{$monitor->id}", ['name' => 'Updated'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Updated');
});

test('user cannot update another teams monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create(['team_id' => $other->current_team_id]);

    $this->withToken(makeToken($user))
        ->putJson("/api/v1/monitors/{$monitor->id}", ['name' => 'Hack'])
        ->assertForbidden();
});

// --- Delete monitor ---

test('user can delete their monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $this->withToken(makeToken($user))
        ->deleteJson("/api/v1/monitors/{$monitor->id}")
        ->assertNoContent();

    expect(Monitor::withTrashed()->find($monitor->id)?->deleted_at)->not->toBeNull();
});

test('user cannot delete another teams monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create(['team_id' => $other->current_team_id]);

    $this->withToken(makeToken($user))
        ->deleteJson("/api/v1/monitors/{$monitor->id}")
        ->assertForbidden();
});
