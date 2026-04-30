<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class AckIncidentController extends Controller
{
    public function __invoke(string $token): Response
    {
        $incident = Incident::query()
            ->where('ack_token', $token)
            ->with('monitor:id,name')
            ->first();

        $status = match (true) {
            $incident === null => 'invalid_token',
            $incident->resolved_at !== null => 'resolved',
            $incident->acked_at !== null => 'already_acked',
            default => 'pending',
        };

        $confirmUrl = $status === 'pending'
            ? URL::temporarySignedRoute(
                'incidents.ack.confirm',
                now()->addMinutes(15),
                ['token' => $token],
            )
            : null;

        return Inertia::render('ack/result', [
            'mode' => 'preview',
            'status' => $status,
            'monitor_name' => $incident?->monitor->name,
            'started_at' => $incident?->started_at?->toIso8601String(),
            'acked_at' => $incident?->acked_at?->toIso8601String(),
            'confirm_url' => $confirmUrl,
        ]);
    }
}
