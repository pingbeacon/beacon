<?php

use App\Actions\HandleStatusChangeAction;
use App\Jobs\CheckHttpMonitorsBatchJob;
use App\Jobs\CheckMonitorJob;
use App\Jobs\SendNotificationJob;
use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\MaintenanceWindow;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\User;
use App\Services\Checkers\DnsChecker;
use App\Services\Checkers\HttpChecker;
use App\Services\Checkers\PingChecker;
use App\Services\Checkers\TcpChecker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

// --- HttpChecker ---

test('http checker returns up when status code is in accepted list', function () {
    Http::fake(['*' => Http::response('OK', 200)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
    ]);

    $result = (new HttpChecker)->check($monitor);

    expect($result->status)->toBe('up');
    expect($result->statusCode)->toBe(200);
    expect($result->responseTime)->toBeGreaterThanOrEqual(0);
});

test('http checker returns down when status code is not in accepted list', function () {
    Http::fake(['*' => Http::response('Not Found', 404)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
    ]);

    $result = (new HttpChecker)->check($monitor);

    expect($result->status)->toBe('down');
    expect($result->statusCode)->toBe(404);
});

test('http checker returns down on connection exception', function () {
    Http::fake(['*' => fn () => throw new Exception('Connection refused')]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
    ]);

    $result = (new HttpChecker)->check($monitor);

    expect($result->status)->toBe('down');
    expect($result->message)->toContain('Connection refused');
});

test('http checker sends custom user agent header', function () {
    Http::fake(['*' => Http::response('OK', 200)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
    ]);

    (new HttpChecker)->check($monitor);

    Http::assertSent(function ($request) {
        return $request->hasHeader('User-Agent', 'Beacon/1.0');
    });
});

// --- TcpChecker ---

test('tcp checker returns down when host is unreachable', function () {
    $monitor = Monitor::factory()->tcp()->create([
        'host' => '192.0.2.1', // TEST-NET, guaranteed unreachable
        'port' => 9999,
        'timeout' => 1,
    ]);

    $result = (new TcpChecker)->check($monitor);

    expect($result->status)->toBe('down');
    expect($result->responseTime)->toBeGreaterThanOrEqual(0);
});

// --- PingChecker ---

test('ping checker returns up for localhost', function () {
    $monitor = Monitor::factory()->ping()->create([
        'host' => '127.0.0.1',
        'timeout' => 2,
    ]);

    $result = (new PingChecker)->check($monitor);

    expect($result->status)->toBe('up');
    expect($result->responseTime)->toBeGreaterThanOrEqual(0);
});

test('ping checker returns down for unreachable host', function () {
    $monitor = Monitor::factory()->ping()->create([
        'host' => '192.0.2.1',
        'timeout' => 1,
    ]);

    $result = (new PingChecker)->check($monitor);

    expect($result->status)->toBe('down');
});

// --- DnsChecker ---

test('dns checker returns up when records are found', function () {
    $monitor = Monitor::factory()->dns()->create([
        'host' => 'google.com',
        'dns_record_type' => 'A',
    ]);

    $result = (new DnsChecker)->check($monitor);

    expect($result->status)->toBe('up');
    expect($result->responseTime)->toBeGreaterThanOrEqual(0);
});

test('dns checker returns down when no records are found', function () {
    $monitor = Monitor::factory()->dns()->create([
        'host' => 'nonexistent.invalid',
        'dns_record_type' => 'A',
    ]);

    $result = (new DnsChecker)->check($monitor);

    expect($result->status)->toBe('down');
    expect($result->message)->toContain('nonexistent.invalid');
});

test('dns checker returns down for invalid record type without throwing', function () {
    $monitor = Monitor::factory()->dns()->create([
        'host' => 'example.com',
        'dns_record_type' => 'INVALID',
    ]);

    $result = (new DnsChecker)->check($monitor);

    expect($result->status)->toBe('down');
    expect($result->message)->not->toBeEmpty();
});

// --- CheckMonitorJob ---

test('check monitor job creates a heartbeat record', function () {
    Http::fake(['*' => Http::response('OK', 200)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
        'retry_count' => 0,
    ]);

    (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction);

    expect($monitor->heartbeats()->count())->toBe(1);

    $heartbeat = $monitor->heartbeats()->first();
    expect($heartbeat->status)->toBe('up');
    expect($heartbeat->status_code)->toBe(200);
});

test('check monitor job updates last_checked_at', function () {
    Http::fake(['*' => Http::response('OK', 200)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
        'retry_count' => 0,
        'last_checked_at' => null,
    ]);

    (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction);

    expect($monitor->fresh()->last_checked_at)->not->toBeNull();
});

test('check monitor job detects status change from up to down and creates incident', function () {
    Http::fake(['*' => Http::response('Server Error', 500)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
        'retry_count' => 0,
    ]);

    (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction);

    expect(Incident::where('monitor_id', $monitor->id)->count())->toBe(1);
    expect($monitor->fresh()->status)->toBe('down');
});

test('check monitor job resolves incident when status changes from down to up', function () {
    Http::fake(['*' => Http::response('OK', 200)]);

    $monitor = Monitor::factory()->http()->down()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'retry_count' => 0,
    ]);

    Incident::factory()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinutes(5),
        'resolved_at' => null,
    ]);

    (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction);

    $incident = Incident::where('monitor_id', $monitor->id)->first();
    expect($incident->resolved_at)->not->toBeNull();
    expect($monitor->fresh()->status)->toBe('up');
});

test('check monitor job dispatches notification for linked channels on status change', function () {
    Queue::fake();
    Http::fake(['*' => Http::response('Server Error', 500)]);

    $user = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($user)->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
        'retry_count' => 0,
    ]);

    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor->notificationChannels()->attach($channel);

    (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction);

    Queue::assertPushedOn('notifications', SendNotificationJob::class);
});

test('check monitor job updates last_checked_at and creates down heartbeat when checker throws', function () {
    $monitor = Monitor::factory()->create([
        'type' => 'unsupported_type',
        'status' => 'up',
        'last_checked_at' => null,
    ]);

    expect(fn () => (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction))->toThrow(InvalidArgumentException::class);

    expect($monitor->fresh()->last_checked_at)->not->toBeNull();
    expect($monitor->heartbeats()->where('status', 'down')->count())->toBe(1);
});

test('handle status change does not create incident or notify when in maintenance', function () {
    Queue::fake();

    $user = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($user)->create(['status' => 'up']);

    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor->notificationChannels()->attach($channel);

    $window = MaintenanceWindow::factory()->active()->create();
    $monitor->maintenanceWindows()->attach($window);

    (new HandleStatusChangeAction)->execute($monitor, 'down', 'test');

    expect($monitor->fresh()->status)->toBe('down');
    expect(Incident::where('monitor_id', $monitor->id)->count())->toBe(0);
    Queue::assertNotPushed(SendNotificationJob::class);
});

test('check monitor job does not create incident when status stays down', function () {
    Http::fake(['*' => Http::response('Server Error', 500)]);

    $monitor = Monitor::factory()->http()->down()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'retry_count' => 0,
    ]);

    Incident::factory()->create([
        'monitor_id' => $monitor->id,
        'started_at' => now()->subMinutes(5),
        'resolved_at' => null,
    ]);

    (new CheckMonitorJob($monitor))->handle(new HandleStatusChangeAction);

    expect(Incident::where('monitor_id', $monitor->id)->count())->toBe(1);
});

// --- DispatchMonitorChecksCommand ---

test('monitors:check dispatches batch job for due http monitors', function () {
    Queue::fake();

    Monitor::factory()->http()->create([
        'is_active' => true,
        'next_check_at' => now()->subMinute(),
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    Queue::assertPushedOn('monitors', CheckHttpMonitorsBatchJob::class);
    Queue::assertNotPushed(CheckMonitorJob::class);
});

test('monitors:check dispatches batch job for http monitors with null next_check_at', function () {
    Queue::fake();

    Monitor::factory()->http()->create([
        'is_active' => true,
        'next_check_at' => null,
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    Queue::assertPushedOn('monitors', CheckHttpMonitorsBatchJob::class);
});

test('monitors:check dispatches individual job for non-http monitors', function () {
    Queue::fake();

    Monitor::factory()->ping()->create([
        'is_active' => true,
        'next_check_at' => now()->subMinute(),
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    Queue::assertPushedOn('monitors', CheckMonitorJob::class);
    Queue::assertNotPushed(CheckHttpMonitorsBatchJob::class);
});

test('monitors:check does not dispatch jobs for inactive monitors', function () {
    Queue::fake();

    Monitor::factory()->http()->paused()->create([
        'next_check_at' => null,
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    Queue::assertNotPushed(CheckMonitorJob::class);
    Queue::assertNotPushed(CheckHttpMonitorsBatchJob::class);
});

test('monitors:check does not dispatch jobs for monitors not yet due', function () {
    Queue::fake();

    Monitor::factory()->http()->create([
        'is_active' => true,
        'next_check_at' => now()->addMinutes(5),
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    Queue::assertNotPushed(CheckMonitorJob::class);
    Queue::assertNotPushed(CheckHttpMonitorsBatchJob::class);
});

test('monitors:check updates next_check_at after dispatching', function () {
    Queue::fake();

    $monitor = Monitor::factory()->http()->create([
        'is_active' => true,
        'next_check_at' => null,
        'interval' => 60,
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    $updated = $monitor->fresh();
    expect($updated->next_check_at)->not->toBeNull();
    expect($updated->next_check_at->isAfter(now()))->toBeTrue();
});

test('monitors:check marks push monitors as down when no heartbeat received', function () {
    $monitor = Monitor::factory()->push()->create([
        'is_active' => true,
        'status' => 'up',
        'interval' => 60,
    ]);

    // Last heartbeat was more than interval*2 seconds ago
    Heartbeat::factory()->for($monitor)->create([
        'created_at' => now()->subMinutes(5),
        'status' => 'up',
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    expect($monitor->fresh()->status)->toBe('down');
    expect($monitor->heartbeats()->latest('created_at')->first()->status)->toBe('down');
});

test('monitors:check marks overdue push monitor as down and creates incident and notifies', function () {
    Queue::fake();

    $user = User::factory()->create();
    $monitor = Monitor::factory()->push()->for($user)->create([
        'is_active' => true,
        'status' => 'up',
        'interval' => 60,
    ]);

    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor->notificationChannels()->attach($channel);

    Heartbeat::factory()->for($monitor)->create([
        'created_at' => now()->subMinutes(5),
        'status' => 'up',
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    expect($monitor->fresh()->status)->toBe('down');
    expect(Incident::where('monitor_id', $monitor->id)->count())->toBe(1);
    Queue::assertPushedOn('notifications', SendNotificationJob::class);
});

// --- CheckHttpMonitorsBatchJob ---

test('batch http job creates heartbeats for all monitors', function () {
    Http::fake(['*' => Http::response('OK', 200)]);

    $monitors = Monitor::factory()->http()->count(3)->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
    ]);

    (new CheckHttpMonitorsBatchJob($monitors->pluck('id')->toArray()))
        ->handle(new HandleStatusChangeAction);

    foreach ($monitors as $monitor) {
        expect($monitor->heartbeats()->count())->toBe(1);
        expect($monitor->heartbeats()->first()->status)->toBe('up');
    }
});

test('batch http job detects status change from up to down', function () {
    Http::fake(['*' => Http::response('Server Error', 500)]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
    ]);

    (new CheckHttpMonitorsBatchJob([$monitor->id]))
        ->handle(new HandleStatusChangeAction);

    expect($monitor->fresh()->status)->toBe('down');
    expect(Incident::where('monitor_id', $monitor->id)->count())->toBe(1);
});

test('batch http job handles connection failure as down', function () {
    Http::fake(['*' => fn () => throw new Exception('Connection refused')]);

    $monitor = Monitor::factory()->http()->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
    ]);

    (new CheckHttpMonitorsBatchJob([$monitor->id]))
        ->handle(new HandleStatusChangeAction);

    $heartbeat = $monitor->heartbeats()->first();
    expect($heartbeat->status)->toBe('down');
    expect($heartbeat->message)->toContain('Connection refused');
});

test('batch http job dispatches notifications on status change', function () {
    Queue::fake();
    Http::fake(['*' => Http::response('Server Error', 500)]);

    $user = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($user)->create([
        'url' => 'https://example.com',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'timeout' => 5,
        'headers' => [],
        'status' => 'up',
    ]);

    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor->notificationChannels()->attach($channel);

    (new CheckHttpMonitorsBatchJob([$monitor->id]))
        ->handle(new HandleStatusChangeAction);

    Queue::assertPushedOn('notifications', SendNotificationJob::class);
});

test('monitors:check does not mark push monitors as down when heartbeat received within interval', function () {
    $monitor = Monitor::factory()->push()->create([
        'is_active' => true,
        'status' => 'up',
        'interval' => 300,
    ]);

    Heartbeat::factory()->for($monitor)->create([
        'created_at' => now()->subSeconds(30),
        'status' => 'up',
    ]);

    $this->artisan('monitors:check')->assertSuccessful();

    expect($monitor->fresh()->status)->toBe('up');
});
