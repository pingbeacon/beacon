<?php

namespace App\Services\Checkers;

use App\DTOs\CheckResult;
use App\Models\Monitor;

interface MonitorChecker
{
    public function check(Monitor $monitor): CheckResult;
}
