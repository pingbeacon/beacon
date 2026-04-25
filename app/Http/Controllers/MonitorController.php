<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMonitorRequest;
use App\Http\Requests\UpdateMonitorRequest;
use App\Http\Resources\HeartbeatResource;
use App\Jobs\CheckSslCertificateJob;
use App\Models\Monitor;
use App\Models\MonitorGroup;
use App\Models\NotificationChannel;
use App\Models\Tag;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class MonitorController extends Controller
{
    /**
     * Display a listing of monitors for the current team.
     */
    public function index(): Response
    {
        $teamId = auth()->user()->current_team_id;

        $monitors = Monitor::query()
            ->where('team_id', $teamId)
            ->with(['tags', 'monitorGroup', 'heartbeats' => fn ($q) => $q->latest()->limit(20)])
            ->latest()
            ->get();

        $tags = Tag::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        $groups = MonitorGroup::query()
            ->where('team_id', $teamId)
            ->with('children')
            ->orderBy('sort_order')
            ->get();

        $trashedCount = Monitor::onlyTrashed()
            ->where('team_id', $teamId)
            ->count();

        return inertia('monitors/index', [
            'monitors' => Inertia::defer(fn () => $monitors),
            'tags' => $tags,
            'groups' => $groups,
            'trashedCount' => $trashedCount,
        ]);
    }

    /**
     * Show the form for creating a new monitor.
     */
    public function create(): Response
    {
        $teamId = auth()->user()->current_team_id;

        $tags = Tag::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        $notificationChannels = NotificationChannel::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        $groups = MonitorGroup::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        return inertia('monitors/create', [
            'tags' => $tags,
            'notificationChannels' => $notificationChannels,
            'groups' => $groups,
        ]);
    }

    /**
     * Store a newly created monitor in storage.
     */
    public function store(StoreMonitorRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $monitor = Monitor::query()->create([
            ...$validated,
            'user_id' => auth()->id(),
            'team_id' => auth()->user()->current_team_id,
            'status' => 'pending',
        ]);

        if (isset($validated['tag_ids'])) {
            $monitor->tags()->sync($validated['tag_ids']);
        }

        if (isset($validated['notification_channel_ids'])) {
            $monitor->notificationChannels()->sync($validated['notification_channel_ids']);
        }

        if ($monitor->type === 'http' && $monitor->ssl_monitoring_enabled && $monitor->url) {
            CheckSslCertificateJob::dispatch($monitor);
        }

        flash(__('Monitor created successfully.'));

        return to_route('monitors.show', $monitor);
    }

    /**
     * Display the specified monitor.
     */
    public function show(Monitor $monitor): Response
    {
        $this->authorize('view', $monitor);

        $monitor->load('tags', 'notificationChannels');

        $period = request()->query('period', '24h');
        $allowedPeriods = ['1h', '24h', '7d', '30d'];
        if (! in_array($period, $allowedPeriods)) {
            $period = '24h';
        }

        $cutoff = match ($period) {
            '1h' => now()->subHour(),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subHours(24),
        };

        return inertia('monitors/show', [
            'monitor' => $monitor,
            'chartPeriod' => $period,
            'sslCertificate' => Inertia::defer(
                fn () => $monitor->sslCertificate
            ),
            'heartbeats' => Inertia::defer(
                fn () => HeartbeatResource::collection($monitor->heartbeats()->latest()->paginate(10))
            ),
            'incidents' => Inertia::defer(
                fn () => $monitor->incidents()->latest('started_at')->get()
            ),
            'chartData' => Inertia::defer(fn () => $this->getChartData($monitor, $period, $cutoff)),
            'uptimeStats' => Inertia::defer(fn () => $monitor->uptimeStats()),
        ]);
    }

    /**
     * Get chart data for a monitor, aggregated by period.
     */
    private function getChartData(Monitor $monitor, string $period, Carbon $cutoff): Collection
    {
        $heartbeats = $monitor->heartbeats()
            ->where('created_at', '>=', $cutoff)
            ->whereNotNull('response_time')
            ->oldest('created_at')
            ->get(['created_at', 'response_time', 'status']);

        if ($period === '7d') {
            return $heartbeats
                ->groupBy(fn ($h) => Carbon::parse($h->created_at)->format('Y-m-d H:00:00'))
                ->map(fn ($group) => (object) [
                    'created_at' => $group->first()->created_at,
                    'response_time' => (int) round($group->avg('response_time')),
                    'status' => $group->last()->status,
                ])
                ->values();
        }

        if ($period === '30d') {
            return $heartbeats
                ->groupBy(fn ($h) => Carbon::parse($h->created_at)->format('Y-m-d'))
                ->map(fn ($group) => (object) [
                    'created_at' => $group->first()->created_at,
                    'response_time' => (int) round($group->avg('response_time')),
                    'status' => $group->last()->status,
                ])
                ->values();
        }

        return $heartbeats;
    }

    /**
     * Show the form for editing the specified monitor.
     */
    public function edit(Monitor $monitor): Response
    {
        $this->authorize('update', $monitor);

        $teamId = auth()->user()->current_team_id;

        $monitor->load('tags', 'notificationChannels');

        $tags = Tag::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        $notificationChannels = NotificationChannel::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        $groups = MonitorGroup::query()
            ->where('team_id', $teamId)
            ->orderBy('name')
            ->get();

        return inertia('monitors/edit', [
            'monitor' => $monitor,
            'tags' => $tags,
            'notificationChannels' => $notificationChannels,
            'groups' => $groups,
        ]);
    }

    /**
     * Update the specified monitor in storage.
     */
    public function update(UpdateMonitorRequest $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('update', $monitor);

        $validated = $request->validated();

        $monitor->update($validated);

        $monitor->tags()->sync($validated['tag_ids'] ?? []);
        $monitor->notificationChannels()->sync($validated['notification_channel_ids'] ?? []);

        if ($monitor->type === 'http' && $monitor->ssl_monitoring_enabled && $monitor->url) {
            CheckSslCertificateJob::dispatch($monitor);
        }

        flash(__('Monitor updated successfully.'));

        return back();
    }

    /**
     * Display a listing of trashed monitors for the authenticated user.
     */
    public function trashed(): Response
    {
        $monitors = Monitor::onlyTrashed()
            ->where('team_id', auth()->user()->current_team_id)
            ->latest('deleted_at')
            ->get();

        return inertia('monitors/trashed', [
            'monitors' => $monitors,
        ]);
    }

    /**
     * Remove the specified monitor from storage.
     */
    public function destroy(Monitor $monitor): RedirectResponse
    {
        $this->authorize('delete', $monitor);

        $monitor->delete();

        flash(__('Monitor deleted successfully.'));

        return to_route('monitors.index');
    }

    /**
     * Permanently delete a soft-deleted monitor.
     */
    public function forceDelete(int $monitorId): RedirectResponse
    {
        $monitor = Monitor::onlyTrashed()->findOrFail($monitorId);

        $this->authorize('forceDelete', $monitor);

        $monitor->forceDelete();

        flash(__('Monitor permanently deleted.'));

        return to_route('monitors.trashed');
    }
}
