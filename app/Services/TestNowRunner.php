<?php

namespace App\Services;

use App\DTOs\CheckResult;
use App\DTOs\TestNowResult;
use App\Models\Monitor;
use App\Services\Checkers\DnsChecker;
use App\Services\Checkers\HttpChecker;
use App\Services\Checkers\MonitorChecker;
use App\Services\Checkers\PingChecker;
use App\Services\Checkers\TcpChecker;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

class TestNowRunner
{
    public function __construct(
        private HttpChecker $http,
        private TcpChecker $tcp,
        private PingChecker $ping,
        private DnsChecker $dns,
    ) {}

    /**
     * Execute a single check against an in-flight monitor configuration.
     * No persistence: the monitor is never saved, no heartbeat written,
     * no assertion result, no incident state change.
     *
     * @param  array<string, mixed>  $config
     */
    public function run(array $config): TestNowResult
    {
        $type = (string) ($config['type'] ?? '');

        $monitor = $this->buildMonitor($config);
        $checker = $this->resolveChecker($type);
        $startedAt = CarbonImmutable::now()->toIso8601String();

        $result = $checker->check($monitor);

        return $this->wrap($result, $startedAt, $type);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function buildMonitor(array $config): Monitor
    {
        $monitor = new Monitor;
        $monitor->forceFill([
            'type' => $config['type'] ?? null,
            'name' => $config['name'] ?? 'Test',
            'url' => $config['url'] ?? null,
            'host' => $config['host'] ?? null,
            'port' => isset($config['port']) ? (int) $config['port'] : null,
            'dns_record_type' => $config['dns_record_type'] ?? null,
            'method' => $config['method'] ?? 'GET',
            'body' => $config['body'] ?? null,
            'headers' => $config['headers'] ?? null,
            'accepted_status_codes' => $config['accepted_status_codes'] ?? [200],
            'timeout' => isset($config['timeout']) ? (int) $config['timeout'] : 10,
            'retry_count' => isset($config['retry_count']) ? (int) $config['retry_count'] : 0,
            'interval' => isset($config['interval']) ? (int) $config['interval'] : 60,
        ]);

        return $monitor;
    }

    private function resolveChecker(string $type): MonitorChecker
    {
        return match ($type) {
            'http' => $this->http,
            'tcp' => $this->tcp,
            'ping' => $this->ping,
            'dns' => $this->dns,
            'push' => throw new InvalidArgumentException('Push monitors cannot be tested live.'),
            default => throw new InvalidArgumentException("Unsupported monitor type: {$type}"),
        };
    }

    private function wrap(CheckResult $result, string $startedAt, string $type): TestNowResult
    {
        return new TestNowResult(
            status: $result->status,
            responseTime: $result->responseTime,
            statusCode: $result->statusCode,
            message: $result->message,
            startedAt: $startedAt,
            type: $type,
        );
    }
}
