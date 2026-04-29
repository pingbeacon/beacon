<?php

use App\Console\Commands\DevFakeServersCommand;
use Database\Seeders\MonitorSeeder;

// --- profile registry ---

test('profile registry covers ports 9001-9020', function () {
    $registry = DevFakeServersCommand::profileRegistry();

    expect(array_keys($registry))->toEqual(range(9001, 9020));
});

test('registry kinds are restricted to the documented set', function () {
    $allowed = ['fast', 'slow', 'jitter', 'spike', 'down_500', 'unbound', 'flap', 'timeout'];

    foreach (DevFakeServersCommand::profileRegistry() as $profile) {
        expect($profile['kind'])->toBeIn($allowed);
    }
});

test('unbound profiles are not bindable', function () {
    foreach (DevFakeServersCommand::profileRegistry() as $profile) {
        if ($profile['kind'] === 'unbound') {
            expect($profile['bind'])->toBeFalse();
        } else {
            expect($profile['bind'])->toBeTrue();
        }
    }
});

// --- localServerHistory: record counts ---

test('localServerHistory generates one record per interval over the window', function () {
    $records = MonitorSeeder::localServerHistory(24, 60, ['kind' => 'fast', 'latency_min' => 5, 'latency_max' => 50]);

    // 24h * 60 / 60s = 1440, plus one for the inclusive end ≈ 1441
    expect(count($records))->toBeGreaterThanOrEqual(1440);
    expect(count($records))->toBeLessThanOrEqual(1442);
});

// --- latency bounds per kind ---

test('fast profile latencies stay inside declared band', function () {
    $records = MonitorSeeder::localServerHistory(2, 30, ['kind' => 'fast', 'latency_min' => 5, 'latency_max' => 50]);

    foreach ($records as $r) {
        expect($r['status'])->toBe('up');
        expect($r['response_time'])->toBeGreaterThanOrEqual(5);
        expect($r['response_time'])->toBeLessThanOrEqual(50);
    }
});

test('slow profile latencies stay inside declared band', function () {
    $records = MonitorSeeder::localServerHistory(2, 60, ['kind' => 'slow', 'latency_min' => 500, 'latency_max' => 1500]);

    foreach ($records as $r) {
        expect($r['status'])->toBe('up');
        expect($r['response_time'])->toBeGreaterThanOrEqual(500);
        expect($r['response_time'])->toBeLessThanOrEqual(1500);
    }
});

test('jitter profile latencies stay inside the wide band', function () {
    $records = MonitorSeeder::localServerHistory(2, 60, ['kind' => 'jitter', 'latency_min' => 10, 'latency_max' => 2000]);

    foreach ($records as $r) {
        expect($r['response_time'])->toBeGreaterThanOrEqual(10);
        expect($r['response_time'])->toBeLessThanOrEqual(2000);
    }
});

// --- distribution per kind ---

test('flap profile produces a status mix near the declared down ratio', function () {
    $records = MonitorSeeder::localServerHistory(24, 30, ['kind' => 'flap', 'flap_down_pct' => 20]);

    $down = collect($records)->where('status', 'down')->count();
    $ratio = $down / count($records);

    expect($ratio)->toBeGreaterThan(0.10);
    expect($ratio)->toBeLessThan(0.30);
});

test('spike profile keeps most latencies fast and a tail above the spike threshold', function () {
    $records = MonitorSeeder::localServerHistory(24, 30, [
        'kind' => 'spike',
        'latency_min' => 5,
        'latency_max' => 50,
        'spike_outlier_pct' => 10,
        'spike_outlier_ms' => 3000,
    ]);

    $spikes = collect($records)->where('response_time', '>=', 3000)->count();
    $ratio = $spikes / count($records);

    expect($ratio)->toBeGreaterThan(0.04);
    expect($ratio)->toBeLessThan(0.16);
});

// --- all-down kinds ---

test('down_500 produces only 500 status_code down records', function () {
    $records = MonitorSeeder::localServerHistory(2, 60, ['kind' => 'down_500']);

    foreach ($records as $r) {
        expect($r['status'])->toBe('down');
        expect($r['status_code'])->toBe(500);
        expect($r['response_time'])->toBeNull();
    }
});

test('unbound produces only down records with null status_code', function () {
    $records = MonitorSeeder::localServerHistory(2, 60, ['kind' => 'unbound']);

    foreach ($records as $r) {
        expect($r['status'])->toBe('down');
        expect($r['status_code'])->toBeNull();
        expect($r['message'])->toBe('Connection refused');
    }
});

test('timeout produces only down records with null status_code', function () {
    $records = MonitorSeeder::localServerHistory(2, 120, ['kind' => 'timeout']);

    foreach ($records as $r) {
        expect($r['status'])->toBe('down');
        expect($r['status_code'])->toBeNull();
        expect($r['message'])->toContain('timeout');
    }
});
