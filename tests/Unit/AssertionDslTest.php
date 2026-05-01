<?php

use App\DTOs\AssertionPayload;
use App\Services\Assertions\AssertionDsl;

function payload(
    ?int $statusCode = null,
    ?int $latencyMs = null,
    ?string $body = null,
    array $headers = [],
    ?string $contentType = null,
): AssertionPayload {
    return new AssertionPayload($statusCode, $latencyMs, $body, $headers, $contentType);
}

describe('status assertions', function () {
    it('passes equality when status matches', function () {
        $verdict = AssertionDsl::evaluate('status', 'status == 200', payload(statusCode: 200));
        expect($verdict->passed)->toBeTrue();
        expect($verdict->actualValue)->toBe('200');
    });

    it('fails equality with mismatched status', function () {
        $verdict = AssertionDsl::evaluate('status', 'status == 200', payload(statusCode: 503));
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('503');
    });

    it('handles inequality operator', function () {
        $verdict = AssertionDsl::evaluate('status', 'status != 500', payload(statusCode: 200));
        expect($verdict->passed)->toBeTrue();
    });

    it('returns no-response actual when status is null', function () {
        $verdict = AssertionDsl::evaluate('status', 'status == 200', payload(statusCode: null));
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('<no response>');
    });

    it('reports parse error for malformed status expression', function () {
        $verdict = AssertionDsl::evaluate('status', 'status > 200', payload(statusCode: 200));
        expect($verdict->parseError)->not->toBeNull();
        expect($verdict->passed)->toBeFalse();
    });
});

describe('latency assertions', function () {
    it('supports each numeric operator', function () {
        $cases = [
            ['response_time_ms < 2000', 1500, true],
            ['response_time_ms < 2000', 2000, false],
            ['response_time_ms <= 2000', 2000, true],
            ['response_time_ms > 1000', 1500, true],
            ['response_time_ms >= 2000', 2000, true],
            ['response_time_ms == 1000', 1000, true],
            ['response_time_ms != 1000', 999, true],
        ];

        foreach ($cases as [$expr, $latency, $expected]) {
            $v = AssertionDsl::evaluate('latency', $expr, payload(latencyMs: $latency));
            expect($v->passed)->toBe($expected, "expr={$expr} latency={$latency}");
        }
    });

    it('returns no-response when latency null', function () {
        $verdict = AssertionDsl::evaluate('latency', 'response_time_ms < 2000', payload(latencyMs: null));
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('<no response>');
    });

    it('parse-errors on missing operator', function () {
        $verdict = AssertionDsl::evaluate('latency', 'response_time_ms 2000', payload(latencyMs: 100));
        expect($verdict->parseError)->not->toBeNull();
    });
});

describe('body json assertions', function () {
    it('resolves a top-level path', function () {
        $verdict = AssertionDsl::evaluate('body', '$.status == "ok"', payload(body: '{"status":"ok"}'));
        expect($verdict->passed)->toBeTrue();
        expect($verdict->actualValue)->toBe('ok');
    });

    it('resolves a nested path', function () {
        $body = json_encode(['data' => ['user' => ['name' => 'mira']]]);
        $verdict = AssertionDsl::evaluate('body', '$.data.user.name == "mira"', payload(body: $body));
        expect($verdict->passed)->toBeTrue();
    });

    it('resolves a quoted bracket key', function () {
        $verdict = AssertionDsl::evaluate('body', '$["status-flag"] == "ok"', payload(body: '{"status-flag":"ok"}'));
        expect($verdict->passed)->toBeTrue();
    });

    it('resolves an array index', function () {
        $verdict = AssertionDsl::evaluate('body', '$.items[0] == "first"', payload(body: '{"items":["first","second"]}'));
        expect($verdict->passed)->toBeTrue();
    });

    it('fails when path is missing', function () {
        $verdict = AssertionDsl::evaluate('body', '$.missing == "x"', payload(body: '{"status":"ok"}'));
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('<missing path>');
    });

    it('fails with unparseable body', function () {
        $verdict = AssertionDsl::evaluate('body', '$.status == "ok"', payload(body: 'not-json'));
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('<unparseable body>');
    });

    it('fails with no body', function () {
        $verdict = AssertionDsl::evaluate('body', '$.status == "ok"', payload(body: ''));
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('<no body>');
    });

    it('supports numeric comparison on body', function () {
        $verdict = AssertionDsl::evaluate('body', '$.queue_depth < 100', payload(body: '{"queue_depth":42}'));
        expect($verdict->passed)->toBeTrue();
    });

    it('reports parse error rather than runtime fail when numeric RHS is malformed', function () {
        $verdict = AssertionDsl::evaluate('body', '$.queue_depth < nope', payload(body: '{"queue_depth":42}'));
        expect($verdict->parseError)->not->toBeNull();
        expect($verdict->passed)->toBeFalse();
    });
});

describe('header assertions', function () {
    it('matches a regex case-insensitively on header name', function () {
        $verdict = AssertionDsl::evaluate(
            'header',
            'X-Trace-Id ~ ^[a-f0-9-]+$',
            payload(headers: ['x-trace-id' => 'a3f7-bc12'])
        );
        expect($verdict->passed)->toBeTrue();
        expect($verdict->actualValue)->toBe('a3f7-bc12');
    });

    it('matches when caller passes mixed-case header keys (DTO normalizes)', function () {
        // The DTO accepts any case and lower-cases keys at its boundary so callers
        // that forget to normalize still get a correct match.
        $verdict = AssertionDsl::evaluate(
            'header',
            'X-Trace-Id ~ ^[a-f0-9-]+$',
            payload(headers: ['X-Trace-Id' => 'a3f7-bc12'])
        );
        expect($verdict->passed)->toBeTrue();
        expect($verdict->actualValue)->toBe('a3f7-bc12');
    });

    it('fails when header is missing', function () {
        $verdict = AssertionDsl::evaluate(
            'header',
            'x-foo ~ .+',
            payload(headers: ['x-bar' => 'baz'])
        );
        expect($verdict->passed)->toBeFalse();
        expect($verdict->actualValue)->toBe('<missing>');
    });

    it('parse-errors on bad regex', function () {
        $verdict = AssertionDsl::evaluate(
            'header',
            'x-foo ~ [unterminated',
            payload(headers: ['x-foo' => 'bar'])
        );
        expect($verdict->parseError)->not->toBeNull();
    });
});

describe('content-type assertions', function () {
    it('matches via contentType field', function () {
        $verdict = AssertionDsl::evaluate(
            'content_type',
            'content-type ~ ^application/json',
            payload(contentType: 'application/json; charset=utf-8')
        );
        expect($verdict->passed)->toBeTrue();
    });

    it('falls back to headers content-type', function () {
        $verdict = AssertionDsl::evaluate(
            'content_type',
            'content-type ~ ^text/html',
            payload(headers: ['content-type' => 'text/html'])
        );
        expect($verdict->passed)->toBeTrue();
    });
});

describe('parse validator', function () {
    it('returns null for a valid expression', function () {
        expect(AssertionDsl::tryParse('status', 'status == 200'))->toBeNull();
    });

    it('returns the reason for an invalid expression', function () {
        expect(AssertionDsl::tryParse('latency', 'response_time_ms 2000'))->not->toBeNull();
    });

    it('detects a malformed body equality literal independent of payload', function () {
        // Without a parse-only path, evaluate() would short-circuit on `<no body>`
        // and miss the bare-word RHS entirely.
        expect(AssertionDsl::tryParse('body', '$.status == ok'))
            ->not->toBeNull();
    });

    it('detects a non-numeric RHS for body numeric comparison', function () {
        expect(AssertionDsl::tryParse('body', '$.queue_depth < not-a-number'))
            ->not->toBeNull();
    });

    it('accepts a well-formed body expression with quoted literal', function () {
        expect(AssertionDsl::tryParse('body', '$.status == "ok"'))->toBeNull();
    });

    it('accepts a well-formed body numeric comparison', function () {
        expect(AssertionDsl::tryParse('body', '$.queue_depth < 100'))->toBeNull();
    });
});
