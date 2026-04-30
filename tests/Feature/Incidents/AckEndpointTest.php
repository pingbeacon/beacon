<?php

use App\Models\Incident;
use App\Models\Monitor;
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

function confirmUrl(Incident $incident, ?int $expiresInSeconds = null): string
{
    return URL::temporarySignedRoute(
        'incidents.ack.confirm',
        $expiresInSeconds === null ? now()->addMinutes(15) : now()->addSeconds($expiresInSeconds),
        ['token' => $incident->ack_token],
    );
}

test('GET /ack with valid signed URL renders the preview without mutating the incident', function () {
    $incident = Incident::factory()->create();

    $response = $this->get(ackUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('mode', 'preview')
        ->where('status', 'pending')
        ->where('monitor_name', $incident->monitor->name)
        ->whereNot('confirm_url', null)
    );
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('GET /ack with tampered signature returns 403', function () {
    $incident = Incident::factory()->create();
    $url = ackUrl($incident).'&signature=deadbeef';

    $response = $this->get($url);

    $response->assertForbidden();
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('GET /ack with expired signed URL returns 403', function () {
    $incident = Incident::factory()->create();
    $url = ackUrl($incident, expiresInSeconds: 60);

    Carbon::setTestNow(now()->addMinutes(2));

    $response = $this->get($url);

    $response->assertForbidden();
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('GET /ack on already-acked incident renders preview with already_acked status and no confirm URL', function () {
    $incident = Incident::factory()->create([
        'acked_at' => now()->subMinutes(3),
    ]);

    $response = $this->get(ackUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('mode', 'preview')
        ->where('status', 'already_acked')
        ->where('confirm_url', null)
    );
});

test('GET /ack on resolved incident renders preview with resolved status and no confirm URL', function () {
    $incident = Incident::factory()->resolved()->create();

    $response = $this->get(ackUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('mode', 'preview')
        ->where('status', 'resolved')
        ->where('confirm_url', null)
    );
});

test('GET /ack with unknown but well-signed token renders invalid_token preview', function () {
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
        ->where('mode', 'preview')
        ->where('status', 'invalid_token')
    );
});

test('POST /ack with valid signed URL acks the incident and renders confirmed result', function () {
    $incident = Incident::factory()->create();

    $response = $this->post(confirmUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('mode', 'confirmed')
        ->where('status', 'acked')
    );

    expect($incident->fresh()->acked_at)->not->toBeNull();
    expect($incident->fresh()->acked_by)->toBeNull();
});

test('POST /ack with tampered signature returns 403 and does not ack', function () {
    $incident = Incident::factory()->create();
    $url = confirmUrl($incident).'&signature=deadbeef';

    $response = $this->post($url);

    $response->assertForbidden();
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('POST /ack on already-acked incident renders confirmed result with already_acked status', function () {
    $incident = Incident::factory()->create(['acked_at' => now()->subMinutes(3)]);

    $response = $this->post(confirmUrl($incident));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('ack/result')
        ->where('mode', 'confirmed')
        ->where('status', 'already_acked')
    );
});

test('POST /incidents/{incident}/ack requires authentication', function () {
    $incident = Incident::factory()->create();

    $response = $this->post("/incidents/{$incident->id}/ack");

    $response->assertRedirect(route('login'));
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('POST /incidents/{incident}/ack rejects users from other teams via policy', function () {
    $monitor = Monitor::factory()->http()->create();
    $incident = Incident::factory()->create(['monitor_id' => $monitor->id]);
    $outsider = User::factory()->create();

    $response = $this->actingAs($outsider)
        ->post("/incidents/{$incident->id}/ack");

    $response->assertForbidden();
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('POST /incidents/{incident}/ack acks the incident with acked_by set to current user', function () {
    $monitor = Monitor::factory()->http()->create();
    $incident = Incident::factory()->create(['monitor_id' => $monitor->id]);

    $response = $this->actingAs($monitor->user)
        ->from('/dashboard')
        ->post("/incidents/{$incident->id}/ack");

    $response->assertRedirect('/dashboard');
    expect($incident->fresh()->acked_at)->not->toBeNull();
    expect($incident->fresh()->acked_by)->toBe($monitor->user->id);
});

test('POST /incidents/{incident}/ack on resolved incident does not mutate', function () {
    $monitor = Monitor::factory()->http()->create();
    $incident = Incident::factory()->resolved()->create(['monitor_id' => $monitor->id]);

    $this->actingAs($monitor->user)
        ->from('/dashboard')
        ->post("/incidents/{$incident->id}/ack");

    expect($incident->fresh()->acked_at)->toBeNull();
});
