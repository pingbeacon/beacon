<?php

namespace App\Http\Controllers;

use App\Services\AckHandler;
use Inertia\Inertia;
use Inertia\Response;

class ConfirmAckController extends Controller
{
    public function __construct(private readonly AckHandler $handler) {}

    public function __invoke(string $token): Response
    {
        $result = $this->handler->ack($token);

        return Inertia::render('ack/result', [
            'mode' => 'confirmed',
            'status' => $result->status->value,
            'monitor_name' => $result->incident?->monitor->name,
            'started_at' => $result->incident?->started_at?->toIso8601String(),
            'acked_at' => $result->incident?->acked_at?->toIso8601String(),
        ]);
    }
}
