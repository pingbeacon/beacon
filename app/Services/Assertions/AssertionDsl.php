<?php

namespace App\Services\Assertions;

use App\DTOs\AssertionPayload;
use App\DTOs\AssertionVerdict;

/**
 * Pure parser/evaluator for the per-monitor assertion DSL.
 *
 * Operators by type:
 *   status        — `status` `==`/`!=` <int>
 *   latency       — `response_time_ms` `<`/`<=`/`>`/`>=`/`==`/`!=` <int>
 *   body          — <jsonpath> `==`/`!=` "<literal>" | <jsonpath> `<`/`<=`/`>`/`>=` <number>
 *   header        — <name> `~` <regex>
 *   content_type  — `content-type` `~` <regex>
 */
final class AssertionDsl
{
    public static function evaluate(string $type, string $expression, AssertionPayload $payload): AssertionVerdict
    {
        return match ($type) {
            'status' => self::evaluateStatus($expression, $payload),
            'latency' => self::evaluateLatency($expression, $payload),
            'body' => self::evaluateBody($expression, $payload),
            'header' => self::evaluateHeader($expression, $payload),
            'content_type' => self::evaluateContentType($expression, $payload),
            default => AssertionVerdict::parseError("unknown assertion type: {$type}"),
        };
    }

    /**
     * Returns null when the expression parses cleanly, otherwise a parse-error reason.
     * Allows the controller layer to validate at write time.
     */
    public static function tryParse(string $type, string $expression): ?string
    {
        if ($type === 'body') {
            return self::parseBodyExpression($expression);
        }

        $verdict = self::evaluate($type, $expression, new AssertionPayload(null, null, null));

        return $verdict->parseError;
    }

    /**
     * Body expressions cannot be validated through evaluate() because evaluation
     * exits early when the payload has no body — masking malformed RHS literals
     * or non-numeric numeric comparisons. Parse the structure independently.
     */
    private static function parseBodyExpression(string $expression): ?string
    {
        if (! preg_match('/^\s*(\$[A-Za-z0-9_\-$.\[\]"\' ]*)\s*(==|!=|<=|>=|<|>)\s*(.+?)\s*$/', $expression, $m)) {
            return 'expected `$<jsonpath> <op> <literal|number>`';
        }

        $path = trim($m[1]);
        $op = $m[2];
        $rhs = trim($m[3]);

        // Validate the JSONPath syntax before checking the RHS
        $pathError = self::validateJsonPath($path);
        if ($pathError !== null) {
            return $pathError;
        }

        if ($op === '==' || $op === '!=') {
            if (self::parseLiteral($rhs) === self::PARSE_ERROR) {
                return "bad literal: {$rhs}";
            }

            return null;
        }

        if (! is_numeric($rhs)) {
            return 'expected numeric RHS for numeric comparison';
        }

        return null;
    }

    private static function evaluateStatus(string $expression, AssertionPayload $payload): AssertionVerdict
    {
        if (! preg_match('/^\s*status\s*(==|!=)\s*(-?\d+)\s*$/', $expression, $m)) {
            return AssertionVerdict::parseError('expected `status (==|!=) <int>`');
        }

        if ($payload->statusCode === null) {
            return AssertionVerdict::fail('<no response>');
        }

        $expected = (int) $m[2];
        $passed = $m[1] === '==' ? $payload->statusCode === $expected : $payload->statusCode !== $expected;

        return new AssertionVerdict($passed, (string) $payload->statusCode);
    }

    private static function evaluateLatency(string $expression, AssertionPayload $payload): AssertionVerdict
    {
        if (! preg_match('/^\s*response_time_ms\s*(<=|>=|==|!=|<|>)\s*(-?\d+)\s*$/', $expression, $m)) {
            return AssertionVerdict::parseError('expected `response_time_ms (<|<=|>|>=|==|!=) <int>`');
        }

        if ($payload->latencyMs === null) {
            return AssertionVerdict::fail('<no response>');
        }

        $threshold = (int) $m[2];
        $passed = self::compareNumeric($payload->latencyMs, $m[1], $threshold);

        return new AssertionVerdict($passed, (string) $payload->latencyMs);
    }

    private static function evaluateBody(string $expression, AssertionPayload $payload): AssertionVerdict
    {
        if (! preg_match('/^\s*(\$[A-Za-z0-9_\-$.\[\]"\' ]*)\s*(==|!=|<=|>=|<|>)\s*(.+?)\s*$/', $expression, $m)) {
            return AssertionVerdict::parseError('expected `$<jsonpath> <op> <literal|number>`');
        }

        if ($payload->body === null || $payload->body === '') {
            return AssertionVerdict::fail('<no body>');
        }

        $decoded = json_decode($payload->body, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            return AssertionVerdict::fail('<unparseable body>');
        }

        try {
            $actual = self::resolveJsonPath($decoded, trim($m[1]));
        } catch (\InvalidArgumentException $e) {
            return AssertionVerdict::parseError($e->getMessage());
        }

        if ($actual === self::PATH_MISSING) {
            return AssertionVerdict::fail('<missing path>');
        }

        $op = $m[2];
        $rhs = trim($m[3]);

        if ($op === '==' || $op === '!=') {
            $literal = self::parseLiteral($rhs);
            if ($literal === self::PARSE_ERROR) {
                return AssertionVerdict::parseError("bad literal: {$rhs}");
            }
            $passed = $op === '==' ? $actual === $literal : $actual !== $literal;

            return new AssertionVerdict($passed, self::scalarToString($actual));
        }

        // numeric comparison
        if (! is_numeric($rhs)) {
            return AssertionVerdict::parseError("expected numeric RHS for numeric comparison, got `{$rhs}`");
        }
        if (! is_numeric($actual)) {
            return AssertionVerdict::fail(self::scalarToString($actual));
        }

        $passed = self::compareNumeric((float) $actual, $op, (float) $rhs);

        return new AssertionVerdict($passed, self::scalarToString($actual));
    }

    private static function evaluateHeader(string $expression, AssertionPayload $payload): AssertionVerdict
    {
        if (! preg_match('/^\s*([A-Za-z0-9_-]+)\s*~\s*(.+?)\s*$/', $expression, $m)) {
            return AssertionVerdict::parseError('expected `<header-name> ~ <regex>`');
        }

        $name = strtolower($m[1]);
        $regex = $m[2];

        return self::evaluateRegex($name, $regex, $payload);
    }

    private static function evaluateContentType(string $expression, AssertionPayload $payload): AssertionVerdict
    {
        if (! preg_match('/^\s*content-type\s*~\s*(.+?)\s*$/', $expression, $m)) {
            return AssertionVerdict::parseError('expected `content-type ~ <regex>`');
        }

        return self::evaluateRegex('content-type', $m[1], $payload);
    }

    private static function evaluateRegex(string $headerName, string $regex, AssertionPayload $payload): AssertionVerdict
    {
        $compiled = '/'.str_replace('/', '\\/', $regex).'/';
        $matchResult = @preg_match($compiled, '');
        if ($matchResult === false) {
            return AssertionVerdict::parseError("invalid regex: {$regex}");
        }

        $value = $headerName === 'content-type'
            ? ($payload->contentType ?? $payload->headers['content-type'] ?? null)
            : ($payload->headers[$headerName] ?? null);

        if ($value === null) {
            return AssertionVerdict::fail('<missing>');
        }

        $passed = preg_match($compiled, $value) === 1;

        return new AssertionVerdict($passed, $value);
    }

    private static function compareNumeric(float|int $lhs, string $op, float|int $rhs): bool
    {
        return match ($op) {
            '<' => $lhs < $rhs,
            '<=' => $lhs <= $rhs,
            '>' => $lhs > $rhs,
            '>=' => $lhs >= $rhs,
            '==' => $lhs == $rhs,
            '!=' => $lhs != $rhs,
            default => false,
        };
    }

    private const PATH_MISSING = "\0__path_missing__\0";

    private const PARSE_ERROR = "\0__parse_error__\0";

    /**
     * Validates JSONPath syntax without traversing data.
     * Returns null if valid, error message otherwise.
     */
    private static function validateJsonPath(string $path): ?string
    {
        if ($path === '$') {
            return null;
        }
        if (! str_starts_with($path, '$')) {
            return 'jsonpath must start with `$`';
        }

        $remaining = substr($path, 1);

        while ($remaining !== '') {
            if ($remaining[0] === '.') {
                $remaining = substr($remaining, 1);
                if (! preg_match('/^([A-Za-z_][A-Za-z0-9_]*)/', $remaining, $m)) {
                    return "malformed jsonpath segment near `{$remaining}`";
                }
                $key = $m[1];
                $remaining = substr($remaining, strlen($key));

                continue;
            }

            if ($remaining[0] === '[') {
                $end = strpos($remaining, ']');
                if ($end === false) {
                    return 'unterminated `[`';
                }
                $inner = substr($remaining, 1, $end - 1);
                $remaining = substr($remaining, $end + 1);

                if (preg_match('/^"(.+)"$/', $inner, $m) || preg_match("/^'(.+)'$/", $inner, $m)) {
                    // Valid quoted key
                    continue;
                }

                if (preg_match('/^\d+$/', $inner)) {
                    // Valid numeric index
                    continue;
                }

                return "bad bracket: [{$inner}]";
            }

            return "unexpected character in path near `{$remaining}`";
        }

        return null;
    }

    private static function resolveJsonPath(mixed $data, string $path): mixed
    {
        // Validate syntax first
        $error = self::validateJsonPath($path);
        if ($error !== null) {
            throw new \InvalidArgumentException($error);
        }

        if ($path === '$') {
            return $data;
        }

        $remaining = substr($path, 1);
        $current = $data;

        while ($remaining !== '') {
            if ($remaining[0] === '.') {
                $remaining = substr($remaining, 1);
                preg_match('/^([A-Za-z_][A-Za-z0-9_]*)/', $remaining, $m);
                $key = $m[1];
                $remaining = substr($remaining, strlen($key));
                if (! is_array($current) || ! array_key_exists($key, $current)) {
                    return self::PATH_MISSING;
                }
                $current = $current[$key];

                continue;
            }

            if ($remaining[0] === '[') {
                $end = strpos($remaining, ']');
                $inner = substr($remaining, 1, $end - 1);
                $remaining = substr($remaining, $end + 1);

                if (preg_match('/^"(.+)"$/', $inner, $m) || preg_match("/^'(.+)'$/", $inner, $m)) {
                    $key = $m[1];
                    if (! is_array($current) || ! array_key_exists($key, $current)) {
                        return self::PATH_MISSING;
                    }
                    $current = $current[$key];

                    continue;
                }

                if (preg_match('/^\d+$/', $inner)) {
                    $idx = (int) $inner;
                    if (! is_array($current) || ! array_key_exists($idx, $current)) {
                        return self::PATH_MISSING;
                    }
                    $current = $current[$idx];

                    continue;
                }
            }
        }

        return $current;
    }

    private static function parseLiteral(string $raw): mixed
    {
        if (preg_match('/^"(.*)"$/', $raw, $m) || preg_match("/^'(.*)'$/", $raw, $m)) {
            return $m[1];
        }
        if ($raw === 'true') {
            return true;
        }
        if ($raw === 'false') {
            return false;
        }
        if ($raw === 'null') {
            return null;
        }
        if (preg_match('/^-?\d+$/', $raw)) {
            return (int) $raw;
        }
        if (preg_match('/^-?\d+\.\d+$/', $raw)) {
            return (float) $raw;
        }

        return self::PARSE_ERROR;
    }

    private static function scalarToString(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_SLASHES) ?: '<array>';
        }

        return (string) $value;
    }
}
