<?php

use App\DTOs\PhaseCaptureResult;
use App\DTOs\PhaseTiming;
use App\Models\Monitor;
use App\Services\PhaseTimingCapture;
use Illuminate\Support\Facades\Http;

test('capture returns a PhaseCaptureResult with body, headers, status code from a successful response', function () {
    Http::fake([
        'https://example.com/health' => Http::response(
            '{"status":"ok"}',
            200,
            ['content-type' => 'application/json'],
        ),
    ]);

    $monitor = Monitor::factory()->make([
        'type' => 'http',
        'url' => 'https://example.com/health',
        'method' => 'GET',
        'timeout' => 10,
    ]);

    $result = app(PhaseTimingCapture::class)->capture($monitor);

    expect($result)->toBeInstanceOf(PhaseCaptureResult::class)
        ->and($result->statusCode)->toBe(200)
        ->and($result->body)->toBe('{"status":"ok"}')
        ->and($result->headers['content-type'][0] ?? $result->headers['content-type'] ?? null)
        ->toContain('application/json')
        ->and($result->error)->toBeNull()
        ->and($result->timing)->toBeInstanceOf(PhaseTiming::class);
});

test('capture surfaces error when the request throws', function () {
    Http::fake([
        'https://broken.example' => fn () => throw new RuntimeException('connection refused'),
    ]);

    $monitor = Monitor::factory()->make([
        'type' => 'http',
        'url' => 'https://broken.example',
        'method' => 'GET',
        'timeout' => 5,
    ]);

    $result = app(PhaseTimingCapture::class)->capture($monitor);

    expect($result->statusCode)->toBeNull()
        ->and($result->error)->toContain('connection refused')
        ->and($result->timing)->toBeInstanceOf(PhaseTiming::class)
        ->and($result->timing->phaseDnsMs)->toBeNull();
});
