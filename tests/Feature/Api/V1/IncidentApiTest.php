<?php

use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;

function incidentToken(User $user): string
{
    $token = $user->createToken('Test', ["team:{$user->current_team_id}", 'incidents:read']);

    return $token->plainTextToken;
}

test('unauthenticated request to incidents returns 401', function () {
    $monitor = Monitor::factory()->create();
    $this->getJson("/api/v1/monitors/{$monitor->id}/incidents")->assertUnauthorized();
});

test('token without incidents:read cannot list incidents', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $token = $user->createToken('No Scope', ["team:{$user->current_team_id}"]);

    $this->withToken($token->plainTextToken)
        ->getJson("/api/v1/monitors/{$monitor->id}/incidents")
        ->assertForbidden();
});

test('user can list incidents for their monitor', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    Incident::factory()->for($monitor)->count(3)->create();

    $this->withToken(incidentToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}/incidents")
        ->assertOk()
        ->assertJsonStructure(['data', 'meta'])
        ->assertJsonCount(3, 'data');
});

test('user cannot list incidents for another teams monitor', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $monitor = Monitor::factory()->for($other)->create(['team_id' => $other->current_team_id]);

    $this->withToken(incidentToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}/incidents")
        ->assertForbidden();
});

test('user can fetch a single incident', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $incident = Incident::factory()->for($monitor)->create();

    $this->withToken(incidentToken($user))
        ->getJson("/api/v1/monitors/{$monitor->id}/incidents/{$incident->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $incident->id);
});

test('incident from different monitor returns 404', function () {
    $user = User::factory()->create();
    $monitor1 = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor2 = Monitor::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $incident = Incident::factory()->for($monitor2)->create();

    $this->withToken(incidentToken($user))
        ->getJson("/api/v1/monitors/{$monitor1->id}/incidents/{$incident->id}")
        ->assertNotFound();
});
