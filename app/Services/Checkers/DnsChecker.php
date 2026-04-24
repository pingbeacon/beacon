<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;
use Throwable;

class DnsChecker implements MonitorChecker
{
    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);

        try {
            // Clean host in case user provided a URL
            $host = preg_replace('/^https?:\/\//i', '', $monitor->host);
            $host = explode('/', $host)[0];
            $host = explode(':', $host)[0];

            $recordType = strtoupper($monitor->dns_record_type ?? 'A');

            if (! defined('DNS_'.$recordType)) {
                throw new \InvalidArgumentException("Unsupported DNS record type: {$recordType}");
            }

            $dnsConstant = constant('DNS_'.$recordType);
            $records = @dns_get_record($host, $dnsConstant);

            $responseTime = (int) round((microtime(true) - $start) * 1000);

            if ($records !== false && count($records) > 0) {
                return new CheckResult(
                    status: 'up',
                    responseTime: $responseTime,
                );
            }

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: "No {$recordType} records found for {$host}",
            );
        } catch (Throwable $e) {
            $responseTime = (int) round((microtime(true) - $start) * 1000);

            return new CheckResult(
                status: 'down',
                responseTime: $responseTime,
                message: $e->getMessage(),
            );
        }
    }
}
