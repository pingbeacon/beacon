<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;

class DnsChecker implements MonitorChecker
{
    public function check(Monitor $monitor): CheckResult
    {
        $start = microtime(true);
        $recordType = strtoupper($monitor->dns_record_type ?? 'A');
        $dnsConstant = constant('DNS_'.$recordType);

        $records = dns_get_record($monitor->host, $dnsConstant);

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
            message: "No {$recordType} records found for {$monitor->host}",
        );
    }
}
