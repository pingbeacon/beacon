<?php

use App\Console\Commands\DevFakeServersCommand;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;
use Database\Seeders\MonitorSeeder;

beforeEach(function () {
    User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@example.com',
    ]);
});

test('seeder registers one local monitor per registry port', function () {
    (new MonitorSeeder)->run();

    foreach (DevFakeServersCommand::profileRegistry() as $port => $profile) {
        $monitor = Monitor::where('url', "http://127.0.0.1:{$port}")->first();

        expect($monitor)->not->toBeNull();
        expect($monitor->name)->toBe($profile['name']);
        expect($monitor->interval)->toBe($profile['interval']);
        expect($monitor->type)->toBe('http');
        expect($monitor->method)->toBe('GET');
    }
});

test('persistent-down profiles get one open incident; flap profiles get none', function () {
    (new MonitorSeeder)->run();

    $persistentDownKinds = ['down_500', 'unbound', 'timeout'];

    foreach (DevFakeServersCommand::profileRegistry() as $port => $profile) {
        $monitor = Monitor::where('url', "http://127.0.0.1:{$port}")->firstOrFail();
        $openIncidents = Incident::where('monitor_id', $monitor->id)->whereNull('resolved_at')->count();

        if (in_array($profile['kind'], $persistentDownKinds, true)) {
            expect($openIncidents)->toBe(1);
            expect($monitor->status)->toBe('down');
        } elseif ($profile['kind'] === 'flap') {
            expect($openIncidents)->toBe(0);
            expect($monitor->status)->toBe('up');
        }
    }
});

test('seeder retains the two HTTPS demo monitors for SSL coverage', function () {
    (new MonitorSeeder)->run();

    expect(Monitor::where('url', 'https://api.github.com')->where('ssl_monitoring_enabled', true)->exists())->toBeTrue();
    expect(Monitor::where('url', 'https://example.com')->where('ssl_monitoring_enabled', true)->exists())->toBeTrue();
});

test('seeder produces 20 local fake-server monitors and 35 total', function () {
    (new MonitorSeeder)->run();

    $local = Monitor::where('url', 'like', 'http://127.0.0.1:%')->count();

    expect($local)->toBe(20);
    expect(Monitor::count())->toBe(35);
});
