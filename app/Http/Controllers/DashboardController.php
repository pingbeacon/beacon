<?php

namespace App\Http\Controllers;

use App\Models\Monitor;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $teamId = auth()->user()->current_team_id;

        $counts = Monitor::query()
            ->where('team_id', $teamId)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up,
                SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down,
                SUM(CASE WHEN status = 'paused' OR is_active = false THEN 1 ELSE 0 END) as paused
            ")
            ->first();

        return inertia('dashboard', [
            'counts' => [
                'total' => (int) $counts->total,
                'up' => (int) $counts->up,
                'down' => (int) $counts->down,
                'paused' => (int) $counts->paused,
            ],
            'monitors' => Inertia::defer(fn () => Monitor::query()
                ->where('team_id', $teamId)
                ->with(['tags', 'heartbeats' => fn ($q) => $q->latest('created_at')->limit(90)])
                ->latest()
                ->get()
                ->map(fn (Monitor $monitor) => [
                    ...$monitor->toArray(),
                    'uptime_percentage' => $monitor->uptimePercentage(24),
                    'average_response_time' => $monitor->averageResponseTime(24),
                ])
            ),
        ]);
    }
}
