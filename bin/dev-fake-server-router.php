<?php

/**
 * Dispatch script for `php -S` fake-server children.
 * Reads FAKE_SERVER_PROFILE (JSON) from environment and responds per profile kind.
 * No Laravel boot — pure PHP.
 */
declare(strict_types=1);

$raw = getenv('FAKE_SERVER_PROFILE');
$profile = $raw ? json_decode($raw, true) : null;

if (! is_array($profile) || ! isset($profile['kind'])) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo "fake-server: missing or invalid FAKE_SERVER_PROFILE\n";

    return;
}

$kind = $profile['kind'];

switch ($kind) {
    case 'fast':
    case 'slow':
    case 'jitter':
        $min = (int) ($profile['latency_min'] ?? 0);
        $max = (int) ($profile['latency_max'] ?? $min);
        $latencyMs = $max > $min ? mt_rand($min, $max) : $min;
        usleep($latencyMs * 1000);
        respondOk($kind, $latencyMs);
        break;

    case 'spike':
        $outlierPct = (int) ($profile['spike_outlier_pct'] ?? 10);
        $isOutlier = mt_rand(1, 100) <= $outlierPct;
        if ($isOutlier) {
            $latencyMs = (int) ($profile['spike_outlier_ms'] ?? 3000);
        } else {
            $min = (int) ($profile['latency_min'] ?? 5);
            $max = (int) ($profile['latency_max'] ?? 50);
            $latencyMs = $max > $min ? mt_rand($min, $max) : $min;
        }
        usleep($latencyMs * 1000);
        respondOk($kind, $latencyMs);
        break;

    case 'flap':
        $downPct = (int) ($profile['flap_down_pct'] ?? 20);
        if (mt_rand(1, 100) <= $downPct) {
            http_response_code(500);
            header('Content-Type: text/plain');
            echo "fake-server flap: simulated 500\n";
        } else {
            respondOk($kind, 0);
        }
        break;

    case 'down_500':
        http_response_code(500);
        header('Content-Type: text/plain');
        echo "fake-server: always 500\n";
        break;

    case 'timeout':
        $sleep = (float) ($profile['sleep_seconds'] ?? 15);
        usleep((int) ($sleep * 1_000_000));
        respondOk($kind, (int) ($sleep * 1000));
        break;

    default:
        http_response_code(500);
        header('Content-Type: text/plain');
        echo "fake-server: unknown kind '{$kind}'\n";
}

function respondOk(string $kind, int $latencyMs): void
{
    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'kind' => $kind, 'latency_ms' => $latencyMs]);
}
