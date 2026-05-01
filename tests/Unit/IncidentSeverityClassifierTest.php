<?php

use App\Enums\IncidentSeverity;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Services\IncidentSeverityClassifier;

beforeEach(function () {
    $this->classifier = new IncidentSeverityClassifier;
});

it('classifies down on a critical monitor as sev1', function () {
    $monitor = new Monitor(['is_critical' => true]);
    $heartbeat = new Heartbeat(['status' => 'down']);

    expect($this->classifier->classify($monitor, $heartbeat))
        ->toBe(IncidentSeverity::Sev1);
});

it('classifies down on a non-critical monitor as sev2', function () {
    $monitor = new Monitor(['is_critical' => false]);
    $heartbeat = new Heartbeat(['status' => 'down']);

    expect($this->classifier->classify($monitor, $heartbeat))
        ->toBe(IncidentSeverity::Sev2);
});

it('classifies degraded as sev3 regardless of critical flag', function () {
    $critical = new Monitor(['is_critical' => true]);
    $regular = new Monitor(['is_critical' => false]);
    $heartbeat = new Heartbeat(['status' => 'degraded']);

    expect($this->classifier->classify($critical, $heartbeat))->toBe(IncidentSeverity::Sev3);
    expect($this->classifier->classify($regular, $heartbeat))->toBe(IncidentSeverity::Sev3);
});

it('classifies anything else as info', function () {
    $monitor = new Monitor(['is_critical' => true]);
    $heartbeat = new Heartbeat(['status' => 'up']);

    expect($this->classifier->classify($monitor, $heartbeat))
        ->toBe(IncidentSeverity::Info);
});

it('treats null heartbeat as info — manual incident creation path', function () {
    $monitor = new Monitor(['is_critical' => true]);

    expect($this->classifier->classify($monitor, null))
        ->toBe(IncidentSeverity::Info);
});
