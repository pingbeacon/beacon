<?php

use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;

it('serves heatmap json with summary for the calendar', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    Incident::factory()->for($monitor)->count(3)->create(['started_at' => now()->subDays(2)]);
    Incident::factory()->for($monitor)->create(['started_at' => now()->subDay()]);

    $response = $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/incident-heatmap")
        ->assertOk();

    $response->assertJsonStructure([
        'days' => [['date', 'count']],
        'summary' => ['incident_days', 'clean_days', 'max_day', 'total'],
    ]);

    $data = $response->json();
    expect($data['days'])->toHaveCount(90);
    expect($data['summary']['total'])->toBe(4);
    expect($data['summary']['max_day'])->toBe(3);
    expect($data['summary']['incident_days'])->toBe(2);
    expect($data['summary']['clean_days'])->toBe(88);
});

it('respects the days query param (default 90, max 365)', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->for($user)->create();

    $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/incident-heatmap?days=30")
        ->assertOk()
        ->assertJsonPath('days.29.date', now()->toDateString());

    $this->actingAs($user)
        ->getJson("/monitors/{$monitor->id}/incident-heatmap?days=9999")
        ->assertStatus(422);
});

it('forbids viewing another team monitor heatmap', function () {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $monitor = Monitor::factory()->for($owner)->create();

    $this->actingAs($stranger)
        ->getJson("/monitors/{$monitor->id}/incident-heatmap")
        ->assertForbidden();
});

it('requires authentication', function () {
    $monitor = Monitor::factory()->create();

    $this->getJson("/monitors/{$monitor->id}/incident-heatmap")
        ->assertUnauthorized();
});
