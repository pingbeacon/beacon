<?php

namespace App\Http\Controllers;

use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
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

        $activeMonitorIds = Monitor::query()
            ->where('team_id', $teamId)
            ->where('is_active', true)
            ->pluck('id');

        $teamUptime30d = null;
        $avgResponse24h = null;

        if ($activeMonitorIds->isNotEmpty()) {
            $stats30d = Heartbeat::query()
                ->whereIn('monitor_id', $activeMonitorIds)
                ->where('created_at', '>=', now()->subHours(720))
                ->selectRaw('COUNT(*) as total, SUM(CASE WHEN status = "up" THEN 1 ELSE 0 END) as up_count')
                ->first();

            if ($stats30d && $stats30d->total > 0) {
                $teamUptime30d = round(($stats30d->up_count / $stats30d->total) * 100, 2);
            }

            $avg = Heartbeat::query()
                ->whereIn('monitor_id', $activeMonitorIds)
                ->where('created_at', '>=', now()->subHours(24))
                ->whereNotNull('response_time')
                ->avg('response_time');

            $avgResponse24h = $avg ? (int) round($avg) : null;
        }

        $openIncidents = Incident::query()
            ->whereHas('monitor', fn ($q) => $q->where('team_id', $teamId))
            ->whereNull('resolved_at')
            ->with('monitor:id,name')
            ->latest('started_at')
            ->limit(5)
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'monitor_id' => $i->monitor->id,
                'monitor_name' => $i->monitor->name,
                'started_at' => $i->started_at->toISOString(),
                'cause' => $i->cause,
            ]);

        $sslCerts = Monitor::query()
            ->where('team_id', $teamId)
            ->where('ssl_monitoring_enabled', true)
            ->with('sslCertificate')
            ->get()
            ->filter(fn ($m) => $m->sslCertificate !== null)
            ->sortBy(fn ($m) => $m->sslCertificate->days_until_expiry ?? 9999)
            ->take(5)
            ->map(fn ($m) => [
                'monitor_name' => $m->name,
                'days_until_expiry' => $m->sslCertificate->days_until_expiry,
                'issuer' => $m->sslCertificate->issuer,
                'is_valid' => $m->sslCertificate->is_valid,
            ])
            ->values();

        $notificationChannels = NotificationChannel::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get(['name', 'type', 'is_enabled']);

        return inertia('dashboard', [
            'counts' => [
                'total' => (int) $counts->total,
                'up' => (int) $counts->up,
                'down' => (int) $counts->down,
                'paused' => (int) $counts->paused,
            ],
            'team_uptime_30d' => $teamUptime30d,
            'avg_response_24h' => $avgResponse24h,
            'open_incidents' => $openIncidents,
            'ssl_certs' => $sslCerts,
            'notification_channels' => $notificationChannels,
            'monitors' => Inertia::defer(fn () => Monitor::query()
                ->where('team_id', $teamId)
                ->with(['tags', 'heartbeats' => fn ($q) => $q->latest('created_at')->limit(90)])
                ->latest()
                ->get()
                ->map(function (Monitor $monitor) {
                    $monitor->setRelation('heartbeats', $monitor->heartbeats->reverse()->values());

                    return [
                        ...$monitor->toArray(),
                        'uptime_percentage' => $monitor->uptimePercentage(24),
                        'average_response_time' => $monitor->averageResponseTime(24),
                    ];
                })
            ),
        ]);
    }
}
