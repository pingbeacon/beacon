<?php

use App\Models\Tag;
use App\Models\User;

test('unauthenticated request returns 401', function () {
    $this->getJson('/api/v1/tags')->assertUnauthorized();
});

test('token without tags:read cannot list tags', function () {
    $user = User::factory()->create();
    $token = $user->createToken('No Scope', ["team:{$user->current_team_id}"]);

    $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/tags')
        ->assertForbidden();
});

test('user can list tags for their team', function () {
    $user = User::factory()->create();
    Tag::factory()->for($user)->count(4)->create(['team_id' => $user->current_team_id]);

    $token = $user->createToken('Test', ["team:{$user->current_team_id}", 'tags:read']);

    $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/tags')
        ->assertOk()
        ->assertJsonStructure(['data', 'meta'])
        ->assertJsonCount(4, 'data');
});

test('tags are scoped to token team', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Tag::factory()->for($user)->create(['team_id' => $user->current_team_id, 'name' => 'Mine']);
    Tag::factory()->for($other)->create(['team_id' => $other->current_team_id, 'name' => 'Theirs']);

    $token = $user->createToken('Test', ["team:{$user->current_team_id}", 'tags:read']);

    $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/tags')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Mine');
});
