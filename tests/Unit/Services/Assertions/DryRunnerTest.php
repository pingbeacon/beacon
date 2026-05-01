<?php

use App\DTOs\AssertionPayload;
use App\Services\Assertions\DryRunner;

it('returns pass verdict for matching status rule', function () {
    $payload = new AssertionPayload(statusCode: 200, latencyMs: 42, body: null);

    $result = (new DryRunner)->run('status', 'status == 200', $payload);

    expect($result->verdict)->toBe('pass');
    expect($result->actualValue)->toBe('200');
    expect($result->parseError)->toBeNull();
    expect($result->type)->toBe('status');
    expect($result->expression)->toBe('status == 200');
    expect($result->evaluationMs)->toBeGreaterThanOrEqual(0.0);
});

it('returns fail verdict for non-matching latency rule', function () {
    $payload = new AssertionPayload(statusCode: 200, latencyMs: 4218, body: null);

    $result = (new DryRunner)->run('latency', 'response_time_ms < 2000', $payload);

    expect($result->verdict)->toBe('fail');
    expect($result->actualValue)->toBe('4218');
    expect($result->parseError)->toBeNull();
});

it('returns parse_error verdict for malformed expression', function () {
    $payload = new AssertionPayload(statusCode: 200, latencyMs: 42, body: null);

    $result = (new DryRunner)->run('latency', 'response_time_ms 2000', $payload);

    expect($result->verdict)->toBe('parse_error');
    expect($result->parseError)->not->toBeNull();
});

it('returns pass for body jsonpath assertion', function () {
    $payload = new AssertionPayload(
        statusCode: 200,
        latencyMs: 50,
        body: '{"status":"ok","db_pool":"saturated"}',
    );

    $result = (new DryRunner)->run('body', '$.status == "ok"', $payload);

    expect($result->verdict)->toBe('pass');
    expect($result->actualValue)->toBe('ok');
});

it('returns fail with sentinel actual when body missing', function () {
    $payload = new AssertionPayload(statusCode: 200, latencyMs: 50, body: null);

    $result = (new DryRunner)->run('body', '$.status == "ok"', $payload);

    expect($result->verdict)->toBe('fail');
    expect($result->actualValue)->toBe('<no body>');
});

it('returns parse_error for unknown assertion type', function () {
    $payload = new AssertionPayload(statusCode: 200, latencyMs: 50, body: null);

    $result = (new DryRunner)->run('bogus', 'whatever', $payload);

    expect($result->verdict)->toBe('parse_error');
    expect($result->parseError)->toContain('unknown assertion type');
});

it('handles header regex assertion against payload headers', function () {
    $payload = new AssertionPayload(
        statusCode: 200,
        latencyMs: 50,
        body: null,
        headers: ['X-Trace-Id' => '7f12-44ab-9c08'],
    );

    $result = (new DryRunner)->run('header', 'X-Trace-Id ~ ^[a-f0-9]', $payload);

    expect($result->verdict)->toBe('pass');
    expect($result->actualValue)->toBe('7f12-44ab-9c08');
});
