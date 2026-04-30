<?php

use App\Actions\HandleStatusChangeAction;
use App\Jobs\CheckHttpMonitorsBatchJob;
use App\Jobs\CheckMonitorJob;
use App\Models\Assertion;
use App\Models\AssertionResult;
use App\Models\Monitor;
use App\Models\User;
use App\Services\Assertions\PersistAssertionResults;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function ingestMonitor(): Monitor
{
    $user = User::factory()->create();

    return Monitor::factory()->for($user)->create([
        'type' => 'http',
        'url' => 'https://api.acme.io/health',
        'method' => 'GET',
        'accepted_status_codes' => [200],
        'interval' => 60,
        'timeout' => 10,
        'retry_count' => 0,
    ]);
}

it('writes assertion_results when a heartbeat ingests via CheckMonitorJob', function () {
    Http::fake([
        'https://api.acme.io/health' => Http::response('{"status":"ok"}', 200, ['content-type' => 'application/json']),
    ]);

    $monitor = ingestMonitor();
    Assertion::factory()->for($monitor)->status(200)->create();
    Assertion::factory()->for($monitor)->latency(2000)->create();
    Assertion::factory()->for($monitor)->bodyJson('$.status', 'ok')->create();

    (new CheckMonitorJob($monitor))->handle(
        app(HandleStatusChangeAction::class),
        app(PersistAssertionResults::class),
    );

    $heartbeatId = $monitor->heartbeats()->latest()->first()->id;

    $rows = AssertionResult::query()->where('heartbeat_id', $heartbeatId)->get();
    expect($rows)->toHaveCount(3);
    expect($rows->every(fn ($r) => $r->passed))->toBeTrue();
});

it('writes assertion_results when a heartbeat ingests via CheckHttpMonitorsBatchJob', function () {
    Http::fake([
        'https://api.acme.io/health' => Http::response(
            '{"status":"degraded"}',
            500,
            ['content-type' => 'application/json'],
        ),
    ]);

    $monitor = ingestMonitor();
    Assertion::factory()->for($monitor)->status(200)->create();
    Assertion::factory()->for($monitor)->bodyJson('$.status', 'ok')->create();

    (new CheckHttpMonitorsBatchJob([$monitor->id]))->handle(
        app(HandleStatusChangeAction::class),
        app(PersistAssertionResults::class),
    );

    $heartbeat = $monitor->heartbeats()->latest()->first();
    expect($heartbeat)->not->toBeNull();

    $rows = AssertionResult::query()->where('heartbeat_id', $heartbeat->id)->get();
    expect($rows)->toHaveCount(2);
    expect($rows->where('passed', false)->count())->toBe(2);
});

it('skips muted assertions during ingest', function () {
    Http::fake([
        'https://api.acme.io/health' => Http::response('{"status":"ok"}', 200, ['content-type' => 'application/json']),
    ]);

    $monitor = ingestMonitor();
    Assertion::factory()->for($monitor)->status(200)->create();
    Assertion::factory()->for($monitor)->status(200)->muted()->create();

    (new CheckMonitorJob($monitor))->handle(
        app(HandleStatusChangeAction::class),
        app(PersistAssertionResults::class),
    );

    expect(AssertionResult::count())->toBe(1);
});

it('writes nothing when a monitor has no assertions', function () {
    Http::fake([
        'https://api.acme.io/health' => Http::response('{}', 200),
    ]);

    $monitor = ingestMonitor();

    (new CheckMonitorJob($monitor))->handle(
        app(HandleStatusChangeAction::class),
        app(PersistAssertionResults::class),
    );

    expect(AssertionResult::count())->toBe(0);
});
