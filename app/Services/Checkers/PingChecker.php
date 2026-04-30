<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;

/**
 * TCP-based reachability check.
 *
 * Despite the "ping" name, this checker does not send ICMP — it opens a TCP
 * socket against the target host. ICMP requires either the `ping` binary (not
 * present in our Alpine prod image or the Sail dev image) or CAP_NET_RAW
 * (rarely granted to containers). TCP reachability is what most monitoring
 * tools actually need: it confirms DNS resolves and at least one common
 * service port accepts connections.
 */
class PingChecker implements MonitorChecker
{
    /**
     * Ports tried in order when the monitor has no explicit port configured.
     *
     * 443 first — most public hosts speak HTTPS even when HTTP/SSH are closed.
     */
    private const FALLBACK_PORTS = [443, 80, 53];

    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);

        try {
            $host = preg_replace('/^https?:\/\//i', '', (string) $monitor->host);
            $host = explode('/', $host)[0];
            $host = explode(':', $host)[0];

            $ports = $monitor->port
                ? [(int) $monitor->port]
                : self::FALLBACK_PORTS;

            $totalTimeout = max(1, (int) $monitor->timeout);
            $perPortTimeout = max(1, (int) floor($totalTimeout / count($ports)));

            $lastError = null;

            foreach ($ports as $port) {
                $errno = 0;
                $errstr = '';
                $portStart = microtime(true);

                $connection = @fsockopen($host, $port, $errno, $errstr, $perPortTimeout);

                if ($connection !== false) {
                    fclose($connection);
                    $responseTime = (int) round((microtime(true) - $portStart) * 1000);

                    return new CheckResult(
                        status: 'up',
                        responseTime: $responseTime,
                    );
                }

                $lastError = $errstr ?: "Connection failed on port {$port}";
            }

            $responseTime = (int) round((microtime(true) - $start) * 1000);

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $lastError ?? "Host {$host} unreachable",
            );
        } catch (\Throwable $e) {
            $responseTime = (int) round((microtime(true) - $start) * 1000);

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $e->getMessage(),
            );
        }
    }
}
