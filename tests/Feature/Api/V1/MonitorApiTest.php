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

test('sensitive request headers are redacted in api response', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
        'headers' => [
            'Authorization' => 'Bearer secret',
            'Set-Cookie' => 'session=abc',
            'Api-Key' => 'k-123',
            'X-Access-Token' => 't-456',
            'X-CSRF-Token' => 'c-789',
            'X-Custom' => 'safe-value',
        ],
    ]);

    $response = $this->withToken(makeToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}")
        ->assertOk();

    expect($response->json('data.headers.Authorization'))->toBe('[REDACTED]');
    expect($response->json('data.headers.Set-Cookie'))->toBe('[REDACTED]');
    expect($response->json('data.headers.Api-Key'))->toBe('[REDACTED]');
    expect($response->json('data.headers.X-Access-Token'))->toBe('[REDACTED]');
    expect($response->json('data.headers.X-CSRF-Token'))->toBe('[REDACTED]');
    expect($response->json('data.headers.X-Custom'))->toBe('safe-value');
});

test('sensitive json body keys are redacted in api response', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
        'body' => json_encode([
            'username' => 'alice',
            'password' => 'p4ss',
            'api_key' => 'k-1',
            'token' => 't-1',
            'access_token' => 'a-1',
            'refresh_token' => 'r-1',
            'client_secret' => 's-1',
            'note' => 'safe',
        ]),
    ]);

    $response = $this->withToken(makeToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}")
        ->assertOk();

    $body = json_decode($response->json('data.body'), true);

    expect($body['password'])->toBe('[REDACTED]');
    expect($body['api_key'])->toBe('[REDACTED]');
    expect($body['token'])->toBe('[REDACTED]');
    expect($body['access_token'])->toBe('[REDACTED]');
    expect($body['refresh_token'])->toBe('[REDACTED]');
    expect($body['client_secret'])->toBe('[REDACTED]');
    expect($body['username'])->toBe('alice');
    expect($body['note'])->toBe('safe');
});

test('non-json body is returned unchanged', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
        'body' => 'plain string body',
    ]);

    $response = $this->withToken(makeToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}")
        ->assertOk();

    expect($response->json('data.body'))->toBe('plain string body');
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
