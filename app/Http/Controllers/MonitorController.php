<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMonitorRequest;
use App\Http\Requests\UpdateMonitorRequest;
use App\Http\Resources\HeartbeatResource;
use App\Jobs\CheckSslCertificateJob;
use App\Models\Assertion;
use App\Models\AssertionResult;
use App\Models\EscalationFire;
use App\Models\EscalationPolicy;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\MonitorGroup;
use App\Models\NotificationChannel;
use App\Models\NotificationRoute;
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
            ->with(['tags', 'monitorGroup', 'heartbeats' => fn ($q) => $q->latest()->limit(90)])
            ->latest()
            ->get()
            ->map(function (Monitor $monitor) {
                $monitor->setRelation('heartbeats', $monitor->heartbeats->reverse()->values());

                return [
                    ...$monitor->toArray(),
                    'uptime_percentage' => $monitor->uptimePercentageFromLoaded(),
                    'average_response_time' => $monitor->averageResponseTimeFromLoaded(),
                ];
            });

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

        $monitor->load(['tags', 'notificationChannels', 'heartbeats' => fn ($q) => $q->latest()->limit(90)]);
        $monitor->setRelation('heartbeats', $monitor->heartbeats->reverse()->values());

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

        $teamChannels = NotificationChannel::query()
            ->where('team_id', $monitor->team_id)
            ->orderBy('name')
            ->get();

        $notificationRoutes = NotificationRoute::query()
            ->where('team_id', $monitor->team_id)
            ->where('monitor_id', $monitor->id)
            ->orderBy('priority')
            ->orderBy('id')
            ->get();

        $escalationPolicy = $this->resolveEscalationPolicy($monitor);
        $activeEscalation = $this->resolveActiveEscalation($monitor);

        return inertia('monitors/show', [
            'monitor' => $monitor,
            'teamNotificationChannels' => $teamChannels,
            'notificationRoutes' => $notificationRoutes,
            'escalationPolicy' => $escalationPolicy,
            'activeEscalation' => $activeEscalation,
            'chartPeriod' => $period,
            'sslCertificate' => Inertia::defer(
                fn () => $monitor->sslCertificate
            ),
            'heartbeats' => Inertia::defer(function () use ($monitor) {
                $paginator = $monitor->heartbeats()->latest()->paginate(10);
                $paginator->setCollection($paginator->getCollection()->reverse()->values());

                return HeartbeatResource::collection($paginator);
            }),
            'incidents' => Inertia::defer(
                fn () => $monitor->incidents()->latest('started_at')->get()
            ),
            'chartData' => Inertia::defer(fn () => $this->getChartData($monitor, $period, $cutoff)),
            'prevChartData' => Inertia::defer(function () use ($monitor, $period, $cutoff) {
                $previousCutoff = $this->previousCutoffFor($period, $cutoff);

                return $this->getChartData($monitor, $period, $previousCutoff, $cutoff);
            }),
            'uptimeStats' => Inertia::defer(fn () => $monitor->uptimeStats()),
            'assertions' => Inertia::defer(fn () => $this->buildAssertionPayload($monitor)),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildAssertionPayload(Monitor $monitor): array
    {
        $assertions = $monitor->assertions()->orderBy('id')->get();
        if ($assertions->isEmpty()) {
            return [];
        }

        $since = now()->subDay();
        $resultsByAssertion = AssertionResult::query()
            ->whereIn('assertion_id', $assertions->pluck('id'))
            ->where('observed_at', '>=', $since)
            ->orderBy('observed_at')
            ->get()
            ->groupBy('assertion_id');

        return $assertions->map(function (Assertion $a) use ($resultsByAssertion) {
            $results = $resultsByAssertion->get($a->id, collect());
            $passCount = $results->where('passed', true)->count();
            $total = $results->count();
            $failed = $results->where('passed', false);
            $lastFail = $failed->last();

            return [
                'id' => $a->id,
                'type' => $a->type,
                'expression' => $a->expression,
                'name' => $a->name,
                'severity' => $a->severity,
                'on_fail' => $a->on_fail,
                'muted' => $a->muted,
                'tolerance' => $a->tolerance,
                'created_at' => optional($a->created_at)->toISOString(),
                'updated_at' => optional($a->updated_at)->toISOString(),
                'pass_rate' => $total > 0 ? round(($passCount / $total) * 100, 2) : null,
                'fail_count_24h' => $failed->count(),
                'total_24h' => $total,
                'last_fail_at' => optional(optional($lastFail)->observed_at)->toISOString(),
                'last_fail_actual' => $lastFail?->actual_value,
                'state' => $this->deriveAssertionState($a, $failed),
                'buckets' => $this->bucketResultsForLastDay($results),
            ];
        })->all();
    }

    private function deriveAssertionState(Assertion $assertion, Collection $recentFailures): string
    {
        if ($assertion->muted) {
            return 'mute';
        }
        if ($recentFailures->isEmpty()) {
            return 'pass';
        }

        return 'fail';
    }

    /**
     * @param  Collection<int, AssertionResult>  $results
     * @return array<int, int> 60 buckets, -1 = no data, 0 = pass, 2 = fail
     */
    private function bucketResultsForLastDay(Collection $results): array
    {
        $buckets = array_fill(0, 60, -1);
        if ($results->isEmpty()) {
            return $buckets;
        }

        $windowStart = now()->subDay()->getTimestamp();
        $windowSeconds = 86_400;
        $bucketSeconds = $windowSeconds / 60;

        foreach ($results as $row) {
            $observed = $row->observed_at;
            if ($observed === null) {
                continue;
            }
            $offset = $observed->getTimestamp() - $windowStart;
            if ($offset < 0 || $offset >= $windowSeconds) {
                continue;
            }
            $idx = (int) floor($offset / $bucketSeconds);
            if ($idx < 0 || $idx >= 60) {
                continue;
            }
            // a single failure dominates a bucket
            if ($row->passed) {
                if ($buckets[$idx] === -1) {
                    $buckets[$idx] = 0;
                }
            } else {
                $buckets[$idx] = 2;
            }
        }

        return $buckets;
    }

    private function previousCutoffFor(string $period, Carbon $cutoff): Carbon
    {
        return match ($period) {
            '1h' => $cutoff->copy()->subHour(),
            '7d' => $cutoff->copy()->subDays(7),
            '30d' => $cutoff->copy()->subDays(30),
            default => $cutoff->copy()->subHours(24),
        };
    }

    /**
     * Get chart data for a monitor, aggregated by period.
     */
    private function getChartData(Monitor $monitor, string $period, Carbon $cutoff, ?Carbon $until = null): Collection
    {
        $query = $monitor->heartbeats()
            ->where('created_at', '>=', $cutoff)
            ->whereNotNull('response_time')
            ->oldest('created_at');

        if ($until !== null) {
            $query->where('created_at', '<', $until);
        }

        $heartbeats = $query->get(['created_at', 'response_time', 'status']);

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

    private function resolveEscalationPolicy(Monitor $monitor): ?EscalationPolicy
    {
        $policy = EscalationPolicy::query()
            ->where('is_active', true)
            ->where('monitor_id', $monitor->id)
            ->with('steps')
            ->first();

        if ($policy !== null) {
            return $policy;
        }

        return EscalationPolicy::query()
            ->where('is_active', true)
            ->whereNull('monitor_id')
            ->where('team_id', $monitor->team_id)
            ->with('steps')
            ->first();
    }

    /**
     * @return array{incident_id: int, fired_step_ids: array<int>}|null
     */
    private function resolveActiveEscalation(Monitor $monitor): ?array
    {
        $incident = Incident::query()
            ->where('monitor_id', $monitor->id)
            ->whereNull('resolved_at')
            ->whereNull('acked_at')
            ->latest('started_at')
            ->first();

        if ($incident === null) {
            return null;
        }

        $firedStepIds = EscalationFire::query()
            ->where('incident_id', $incident->id)
            ->pluck('escalation_step_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return [
            'incident_id' => $incident->id,
            'fired_step_ids' => $firedStepIds,
        ];
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
