<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Monitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushHeartbeatController extends Controller
{
    /**
     * Handle an incoming push heartbeat for the given token.
     */
    public function __invoke(Request $request, string $token): JsonResponse
    {
        $monitor = Monitor::query()
            ->where('push_token', $token)
            ->where('type', 'push')
            ->where('is_active', true)
            ->first();

        abort_if($monitor === null, 404, 'Monitor not found.');

        $monitor->heartbeats()->create([
            'status' => 'up',
            'response_time' => 0,
            'message' => 'Push heartbeat received.',
        ]);

        if ($monitor->status !== 'up') {
            $monitor->update([
                'status' => 'up',
                'last_checked_at' => now(),
            ]);

            $monitor->incidents()
                ->whereNull('resolved_at')
                ->update(['resolved_at' => now()]);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Heartbeat received.',
        ]);
    }
}
