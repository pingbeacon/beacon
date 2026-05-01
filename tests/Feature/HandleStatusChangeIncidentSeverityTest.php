<?php

use App\Actions\HandleStatusChangeAction;
use App\Enums\IncidentSeverity;
use App\Models\Heartbeat;
use App\Models\Monitor;

it('persists severity from classifier when opening an incident on a critical monitor', function () {
    $monitor = Monitor::factory()->create([
        'is_critical' => true,
        'status' => 'up',
    ]);
    Heartbeat::factory()->for($monitor)->create([
        'status' => 'down',
        'created_at' => now(),
    ]);

    app(HandleStatusChangeAction::class)->execute($monitor, 'down', 'connection refused');

    $incident = $monitor->incidents()->latest('id')->firstOrFail();
    expect($incident->severity)->toBe(IncidentSeverity::Sev1);
});

it('persists sev2 severity when opening an incident on a non-critical monitor', function () {
    $monitor = Monitor::factory()->create([
        'is_critical' => false,
        'status' => 'up',
    ]);
    Heartbeat::factory()->for($monitor)->create([
        'status' => 'down',
        'created_at' => now(),
    ]);

    app(HandleStatusChangeAction::class)->execute($monitor, 'down', 'http 503');

    expect($monitor->incidents()->latest('id')->firstOrFail()->severity)
        ->toBe(IncidentSeverity::Sev2);
});

it('always populates severity — never null', function () {
    $monitor = Monitor::factory()->create(['status' => 'up']);
    Heartbeat::factory()->for($monitor)->create([
        'status' => 'down',
        'created_at' => now(),
    ]);

    app(HandleStatusChangeAction::class)->execute($monitor, 'down');

    expect($monitor->incidents()->latest('id')->firstOrFail()->severity)
        ->toBeInstanceOf(IncidentSeverity::class);
});
