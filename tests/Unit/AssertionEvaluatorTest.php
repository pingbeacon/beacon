<?php

use App\DTOs\AssertionPayload;
use App\Models\Assertion;
use App\Services\Assertions\AssertionEvaluator;

it('emits one result per active assertion', function () {
    $assertions = [
        new Assertion(['type' => 'status', 'expression' => 'status == 200', 'severity' => 'critical', 'on_fail' => 'open_incident', 'muted' => false, 'tolerance' => 1]),
        new Assertion(['type' => 'latency', 'expression' => 'response_time_ms < 1000', 'severity' => 'warning', 'on_fail' => 'log_only', 'muted' => false, 'tolerance' => 1]),
    ];
    $assertions[0]->id = 11;
    $assertions[1]->id = 22;

    $payload = new AssertionPayload(statusCode: 200, latencyMs: 500, body: null);
    $observedAt = new DateTimeImmutable('2026-04-30 12:00:00');

    $results = (new AssertionEvaluator)->evaluate($payload, $assertions, $observedAt);

    expect($results)->toHaveCount(2);
    expect($results[0]->assertionId)->toBe(11);
    expect($results[0]->passed)->toBeTrue();
    expect($results[0]->actualValue)->toBe('200');
    expect($results[0]->observedAt)->toEqual($observedAt);
    expect($results[1]->assertionId)->toBe(22);
    expect($results[1]->passed)->toBeTrue();
});

it('skips muted assertions', function () {
    $a = new Assertion(['type' => 'status', 'expression' => 'status == 200', 'muted' => true, 'severity' => 'info', 'on_fail' => 'log_only', 'tolerance' => 1]);
    $a->id = 1;

    $results = (new AssertionEvaluator)->evaluate(
        new AssertionPayload(statusCode: 503, latencyMs: 0, body: null),
        [$a],
        new DateTimeImmutable
    );

    expect($results)->toBeEmpty();
});

it('skips body assertions when payload body is null', function () {
    $a = new Assertion(['type' => 'body', 'expression' => '$.status == "ok"', 'muted' => false, 'severity' => 'warning', 'on_fail' => 'log_only', 'tolerance' => 1]);
    $a->id = 1;

    $results = (new AssertionEvaluator)->evaluate(
        new AssertionPayload(statusCode: 200, latencyMs: 100, body: null),
        [$a],
        new DateTimeImmutable
    );

    expect($results)->toBeEmpty();
});

it('skips header assertions when no headers present', function () {
    $a = new Assertion(['type' => 'header', 'expression' => 'x-foo ~ bar', 'muted' => false, 'severity' => 'info', 'on_fail' => 'log_only', 'tolerance' => 1]);
    $a->id = 1;

    $results = (new AssertionEvaluator)->evaluate(
        new AssertionPayload(statusCode: 200, latencyMs: 100, body: null, headers: []),
        [$a],
        new DateTimeImmutable
    );

    expect($results)->toBeEmpty();
});

it('emits a fail row with parse error when expression is malformed', function () {
    $a = new Assertion(['type' => 'latency', 'expression' => 'gibberish', 'muted' => false, 'severity' => 'warning', 'on_fail' => 'log_only', 'tolerance' => 1]);
    $a->id = 99;

    $results = (new AssertionEvaluator)->evaluate(
        new AssertionPayload(statusCode: 200, latencyMs: 200, body: null),
        [$a],
        new DateTimeImmutable
    );

    expect($results)->toHaveCount(1);
    expect($results[0]->passed)->toBeFalse();
    expect($results[0]->actualValue)->toContain('parse error');
});

it('produces deterministic results for a mixed-rule heartbeat', function () {
    $rules = [
        new Assertion(['type' => 'status', 'expression' => 'status == 200', 'muted' => false, 'severity' => 'critical', 'on_fail' => 'open_incident', 'tolerance' => 1]),
        new Assertion(['type' => 'latency', 'expression' => 'response_time_ms < 2000', 'muted' => false, 'severity' => 'critical', 'on_fail' => 'open_incident', 'tolerance' => 1]),
        new Assertion(['type' => 'body', 'expression' => '$.status == "ok"', 'muted' => false, 'severity' => 'warning', 'on_fail' => 'log_only', 'tolerance' => 1]),
        new Assertion(['type' => 'content_type', 'expression' => 'content-type ~ ^application/json', 'muted' => false, 'severity' => 'info', 'on_fail' => 'log_only', 'tolerance' => 1]),
    ];
    foreach ($rules as $i => $rule) {
        $rule->id = $i + 1;
    }

    $payload = new AssertionPayload(
        statusCode: 200,
        latencyMs: 4218,
        body: '{"status":"ok"}',
        headers: ['content-type' => 'application/json'],
        contentType: 'application/json',
    );

    $results = (new AssertionEvaluator)->evaluate($payload, $rules, new DateTimeImmutable);

    expect($results)->toHaveCount(4);
    expect($results[0]->passed)->toBeTrue();
    expect($results[1]->passed)->toBeFalse();
    expect($results[1]->actualValue)->toBe('4218');
    expect($results[2]->passed)->toBeTrue();
    expect($results[3]->passed)->toBeTrue();
});
