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

    $host = config('services.fake_servers.host');

    foreach (DevFakeServersCommand::profileRegistry() as $port => $profile) {
        $monitor = Monitor::where('url', "http://{$host}:{$port}")->first();

        expect($monitor)->not->toBeNull();
        expect($monitor->name)->toBe($profile['name']);
        expect($monitor->interval)->toBe($profile['interval']);
        expect($monitor->type)->toBe('http');
        expect($monitor->method)->toBe('GET');
    }
});

test('persistent-down profiles get one open incident; flap profiles get none', function () {
    (new MonitorSeeder)->run();

    $host = config('services.fake_servers.host');
    $persistentDownKinds = ['down_500', 'unbound', 'timeout'];

    foreach (DevFakeServersCommand::profileRegistry() as $port => $profile) {
        $monitor = Monitor::where('url', "http://{$host}:{$port}")->firstOrFail();
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

    $host = config('services.fake_servers.host');
    $local = Monitor::where('url', 'like', "http://{$host}:%")->count();

    expect($local)->toBe(20);
    expect(Monitor::count())->toBe(35);
});

test('seeder uses configured services.fake_servers.host for local monitor URLs', function () {
    config(['services.fake_servers.host' => 'fake-servers']);

    (new MonitorSeeder)->run();

    expect(Monitor::where('url', 'http://fake-servers:9001')->exists())->toBeTrue();
    expect(Monitor::where('url', 'like', 'http://127.0.0.1:%')->exists())->toBeFalse();
});

test('default fake-servers host is 127.0.0.1 so composer run dev path is preserved', function () {
    expect(config('services.fake_servers.host'))->toBe('127.0.0.1');
});

test('default fake-servers bind host is 127.0.0.1', function () {
    expect(config('services.fake_servers.bind_host'))->toBe('127.0.0.1');
});

test('DevFakeServersCommand bind host reflects services.fake_servers.bind_host config', function () {
    config(['services.fake_servers.bind_host' => '0.0.0.0']);

    expect(DevFakeServersCommand::bindHost())->toBe('0.0.0.0');

    config(['services.fake_servers.bind_host' => '127.0.0.1']);

    expect(DevFakeServersCommand::bindHost())->toBe('127.0.0.1');
});
