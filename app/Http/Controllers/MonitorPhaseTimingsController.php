<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonitorPhaseTimingsRequest;
use App\Models\Monitor;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class MonitorPhaseTimingsController extends Controller
{
    private const PHASE_COLUMNS = [
        'dns' => 'phase_dns_ms',
        'tcp' => 'phase_tcp_ms',
        'tls' => 'phase_tls_ms',
        'ttfb' => 'phase_ttfb_ms',
        'transfer' => 'phase_transfer_ms',
    ];

    public function __invoke(MonitorPhaseTimingsRequest $request, Monitor $monitor): JsonResponse
    {
        $this->authorize('view', $monitor);

        $period = $request->validated('period', '24h');
        $cutoff = $this->cutoffFor($period);

        $rows = $monitor->heartbeats()
            ->where('created_at', '>=', $cutoff)
            ->select(array_values(self::PHASE_COLUMNS))
            ->get();

        $count = $rows->count();
        $phases = [];

        foreach (self::PHASE_COLUMNS as $key => $column) {
            $values = $rows->pluck($column)
                ->filter(fn ($v) => $v !== null)
                ->map(fn ($v) => (int) $v)
                ->values()
                ->all();

            $phases[$key] = [
                'avg' => $this->avg($values),
                'p95' => $this->percentile($values, 0.95),
                'count' => count($values),
            ];
        }

        return response()->json([
            'period' => $period,
            'count' => $count,
            'phases' => $phases,
        ]);
    }

    private function cutoffFor(string $period): Carbon
    {
        return match ($period) {
            '1h' => now()->subHour(),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subHours(24),
        };
    }

    /**
     * @param  array<int>  $values
     */
    private function avg(array $values): ?int
    {
        if ($values === []) {
            return null;
        }

        return (int) round(array_sum($values) / count($values));
    }

    /**
     * @param  array<int>  $values
     */
    private function percentile(array $values, float $p): ?int
    {
        if ($values === []) {
            return null;
        }

        sort($values);
        $index = (int) min(count($values) - 1, max(0, floor($p * count($values))));

        return $values[$index];
    }
}
