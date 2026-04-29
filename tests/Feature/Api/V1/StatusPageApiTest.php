<?php

use App\Models\StatusPage;
use App\Models\User;

function statusPageToken(User $user, array $extra = []): string
{
    $scopes = array_merge(['status-pages:read', 'status-pages:write'], $extra);
    $token = $user->createToken('Test', array_merge(["team:{$user->current_team_id}"], $scopes));

    return $token->plainTextToken;
}

test('unauthenticated request returns 401', function () {
    $this->getJson('/api/v1/status-pages')->assertUnauthorized();
});

test('token without status-pages:read cannot list status pages', function () {
    $user = User::factory()->create();
    $token = $user->createToken('No Scope', ["team:{$user->current_team_id}"]);

    $this->withToken($token->plainTextToken)
        ->getJson('/api/v1/status-pages')
        ->assertForbidden();
});

test('user can list status pages', function () {
    $user = User::factory()->create();
    StatusPage::factory()->for($user)->count(2)->create(['team_id' => $user->current_team_id]);

    $this->withToken(statusPageToken($user))
        ->getJson('/api/v1/status-pages')
        ->assertOk()
        ->assertJsonStructure(['data', 'meta'])
        ->assertJsonCount(2, 'data');
});

test('status pages are scoped to token team', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    StatusPage::factory()->for($user)->create(['team_id' => $user->current_team_id, 'title' => 'Mine']);
    StatusPage::factory()->for($other)->create(['team_id' => $other->current_team_id, 'title' => 'Theirs']);

    $this->withToken(statusPageToken($user))
        ->getJson('/api/v1/status-pages')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Mine');
});

test('user can fetch a single status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $this->withToken(statusPageToken($user))
        ->getJson("/api/v1/status-pages/{$statusPage->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $statusPage->id);
});

test('user cannot fetch another teams status page', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $statusPage = StatusPage::factory()->for($other)->create(['team_id' => $other->current_team_id]);

    $this->withToken(statusPageToken($user))
        ->getJson("/api/v1/status-pages/{$statusPage->id}")
        ->assertForbidden();
});

test('user can create a status page', function () {
    $user = User::factory()->create();

    $this->withToken(statusPageToken($user))
        ->postJson('/api/v1/status-pages', [
            'title' => 'My Status Page',
            'slug' => 'my-status-page',
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'My Status Page');

    expect(StatusPage::query()->where('team_id', $user->current_team_id)->count())->toBe(1);
});

test('status page creation fails with duplicate slug', function () {
    $user = User::factory()->create();
    StatusPage::factory()->for($user)->create([
        'team_id' => $user->current_team_id,
        'slug' => 'taken',
    ]);

    $this->withToken(statusPageToken($user))
        ->postJson('/api/v1/status-pages', [
            'title' => 'Dupe',
            'slug' => 'taken',
        ])
        ->assertUnprocessable();
});

test('token with only status-pages:read cannot update a status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $token = $user->createToken('Read Only', ["team:{$user->current_team_id}", 'status-pages:read']);

    $this->withToken($token->plainTextToken)
        ->putJson("/api/v1/status-pages/{$statusPage->id}", ['title' => 'Sneaky Update'])
        ->assertForbidden();
});

test('user can update a status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $this->withToken(statusPageToken($user))
        ->putJson("/api/v1/status-pages/{$statusPage->id}", [
            'title' => 'Updated',
            'slug' => $statusPage->slug,
        ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Updated');
});

test('user can delete a status page', function () {
    $user = User::factory()->create();
    $statusPage = StatusPage::factory()->for($user)->create(['team_id' => $user->current_team_id]);

    $this->withToken(statusPageToken($user))
        ->deleteJson("/api/v1/status-pages/{$statusPage->id}")
        ->assertNoContent();

    expect(StatusPage::find($statusPage->id))->toBeNull();
});
