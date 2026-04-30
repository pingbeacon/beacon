<?php

use App\DTOs\CheckResult;
use App\DTOs\TestNowResult;
use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Services\Checkers\HttpChecker;
use App\Services\TestNowRunner;

test('TestNowRunner returns a TestNowResult shaped from CheckResult', function () {
    $this->app->instance(HttpChecker::class, new class extends HttpChecker
    {
        public function check(Monitor $monitor): CheckResult
        {
            return new CheckResult(status: 'up', responseTime: 142, statusCode: 200);
        }
    });

    $result = app(TestNowRunner::class)->run([
        'type' => 'http',
        'name' => 'in-flight config',
        'url' => 'https://example.com/health',
        'method' => 'GET',
        'timeout' => 10,
    ]);

    expect($result)->toBeInstanceOf(TestNowResult::class)
        ->and($result->status)->toBe('up')
        ->and($result->responseTime)->toBe(142)
        ->and($result->statusCode)->toBe(200)
        ->and($result->type)->toBe('http')
        ->and($result->startedAt)->not->toBeEmpty();
});

test('TestNowRunner does not persist anything', function () {
    $this->app->instance(HttpChecker::class, new class extends HttpChecker
    {
        public function check(Monitor $monitor): CheckResult
        {
            return new CheckResult(status: 'up', responseTime: 100, statusCode: 200);
        }
    });

    Monitor::factory()->create();
    $monitorsBefore = Monitor::query()->count();
    $heartbeatsBefore = Heartbeat::query()->count();
    $incidentsBefore = Incident::query()->count();

    app(TestNowRunner::class)->run([
        'type' => 'http',
        'name' => 'in-flight',
        'url' => 'https://example.com',
        'method' => 'GET',
        'timeout' => 10,
    ]);

    expect(Monitor::query()->count())->toBe($monitorsBefore)
        ->and(Heartbeat::query()->count())->toBe($heartbeatsBefore)
        ->and(Incident::query()->count())->toBe($incidentsBefore);
});

test('TestNowRunner passes the in-flight monitor instance to the checker without saving it', function () {
    $captured = new class
    {
        public ?Monitor $seen = null;
    };

    $this->app->instance(HttpChecker::class, new class($captured) extends HttpChecker
    {
        public function __construct(private object $captured) {}

        public function check(Monitor $monitor): CheckResult
        {
            $this->captured->seen = $monitor;

            return new CheckResult(status: 'up', responseTime: 50, statusCode: 200);
        }
    });

    app(TestNowRunner::class)->run([
        'type' => 'http',
        'name' => 'unsaved',
        'url' => 'https://example.com',
        'method' => 'POST',
        'timeout' => 7,
    ]);

    expect($captured->seen)->not->toBeNull()
        ->and($captured->seen->exists)->toBeFalse()
        ->and($captured->seen->name)->toBe('unsaved')
        ->and($captured->seen->method)->toBe('POST')
        ->and($captured->seen->timeout)->toBe(7);
});

test('TestNowRunner runs checker exactly once even when retry_count is set', function () {
    $counter = new class
    {
        public int $calls = 0;
    };

    $this->app->instance(HttpChecker::class, new class($counter) extends HttpChecker
    {
        public function __construct(private object $counter) {}

        public function check(Monitor $monitor): CheckResult
        {
            $this->counter->calls++;

            return new CheckResult(status: 'down', responseTime: 30, message: 'simulated fail');
        }
    });

    app(TestNowRunner::class)->run([
        'type' => 'http',
        'name' => 'no retries on test',
        'url' => 'https://example.com',
        'method' => 'GET',
        'timeout' => 10,
        'retry_count' => 5,
    ]);

    expect($counter->calls)->toBe(1);
});

test('TestNowRunner rejects push monitors', function () {
    app(TestNowRunner::class)->run([
        'type' => 'push',
        'name' => 'bad',
    ]);
})->throws(InvalidArgumentException::class);
