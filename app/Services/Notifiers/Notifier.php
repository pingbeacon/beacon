<?php

namespace App\Services\Notifiers;

use App\Models\Monitor;
use App\Models\NotificationChannel;

interface Notifier
{
    public function send(NotificationChannel $channel, Monitor $monitor, string $status, ?string $message = null): void;
}
