<?php

use App\Models\Incident;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

function ackUrl(Incident $incident, ?int $expiresInSeconds = null): string
{
    return URL::temporarySignedRoute(
        'incidents.ack',
        $expiresInSeconds === null ? now()->addDays(7) : now()->addSeconds($expiresInSeconds),
        ['token' => $incident->ack_token],
    );
}

test('GET /ack with valid signed URL acks the incident and renders ack/result with acked status', function () {
    $incident = Incident::factory()->create();

    $response = $this->get(ackUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('status', 'acked')
        ->where('monitor_name', $incident->monitor->name)
    );

    expect($incident->fresh()->acked_at)->not->toBeNull();
    expect($incident->fresh()->acked_by)->toBeNull();
});

test('GET /ack with tampered signature returns 403', function () {
    $incident = Incident::factory()->create();
    $url = ackUrl($incident).'&signature=deadbeef';

    $response = $this->get($url);

    $response->assertForbidden();
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('GET /ack with expired signed URL returns 403 and does not ack', function () {
    $incident = Incident::factory()->create();
    $url = ackUrl($incident, expiresInSeconds: 60);

    Carbon::setTestNow(now()->addMinutes(2));

    $response = $this->get($url);

    $response->assertForbidden();
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('GET /ack on already-acked incident renders already_acked status', function () {
    $incident = Incident::factory()->create([
        'acked_at' => now()->subMinutes(3),
    ]);

    $response = $this->get(ackUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('status', 'already_acked')
    );
});

test('GET /ack on resolved incident renders resolved status', function () {
    $incident = Incident::factory()->resolved()->create();

    $response = $this->get(ackUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('status', 'resolved')
    );
});

test('GET /ack with unknown but well-signed token renders invalid_token status', function () {
    Incident::factory()->create();

    $url = URL::temporarySignedRoute(
        'incidents.ack',
        now()->addDays(7),
        ['token' => 'this-token-is-not-in-the-database'],
    );

    $response = $this->get($url);

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('status', 'invalid_token')
    );
});

test('POST /incidents/{incident}/ack requires authentication', function () {
    $incident = Incident::factory()->create();

    $response = $this->post("/incidents/{$incident->id}/ack");

    $response->assertRedirect(route('login'));
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('POST /incidents/{incident}/ack acks the incident with acked_by set to current user', function () {
    $user = User::factory()->create();
    $incident = Incident::factory()->create();

    $response = $this->actingAs($user)
        ->from('/dashboard')
        ->post("/incidents/{$incident->id}/ack");

    $response->assertRedirect('/dashboard');
    expect($incident->fresh()->acked_at)->not->toBeNull();
    expect($incident->fresh()->acked_by)->toBe($user->id);
});

test('POST /incidents/{incident}/ack on resolved incident does not mutate', function () {
    $user = User::factory()->create();
    $incident = Incident::factory()->resolved()->create();

    $this->actingAs($user)
        ->from('/dashboard')
        ->post("/incidents/{$incident->id}/ack");

    expect($incident->fresh()->acked_at)->toBeNull();
});
