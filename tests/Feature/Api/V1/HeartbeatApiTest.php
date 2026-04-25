<?php

use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

function heartbeatToken(User $user): string
{
    $token = $user->createToken('Test', ["team:{$user->current_team_id}", 'heartbeats:read']);

    return $token->plainTextToken;
}

test('unauthenticated request to heartbeats returns 401', function () {
    $monitor = Monitor::factory()->create();
    $this->getJson("/api/v1/monitors/{$monitor->id}/heartbeats")->assertUnauthorized();
});

test('token without heartbeats:read cannot list heartbeats', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $token = $user->createToken('No Scope', ["team:{$user->current_team_id}"]);

    $this->withToken($token->plainTextToken)
        ->getJson("/api/v1/monitors/{$monitor->id}/heartbeats")
        ->assertForbidden();
});

test('user can list heartbeats for their monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    Heartbeat::factory()->for($monitor)->count(5)->create();

    $this->withToken(heartbeatToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}/heartbeats")
        ->assertOk()
        ->assertJsonStructure(['data', 'meta'])
        ->assertJsonCount(5, 'data');
});

test('user cannot list heartbeats for another teams monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create(['team_id' => $other->current_team_id]);

    $this->withToken(heartbeatToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}/heartbeats")
        ->assertForbidden();
});

test('user can fetch a single heartbeat', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $heartbeat = Heartbeat::factory()->for($monitor)->create();

    $this->withToken(heartbeatToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}/heartbeats/{$heartbeat->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $heartbeat->id);
});

test('heartbeat from different monitor returns 404', function () {
    $user = User::factory()->create();
    $monitor1 = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor2 = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $heartbeat = Heartbeat::factory()->for($monitor2)->create();

    $this->withToken(heartbeatToken($user))
        ->getJson("/api/v1/monitors/{$monitor1->id}/heartbeats/{$heartbeat->id}")
        ->assertNotFound();
});
