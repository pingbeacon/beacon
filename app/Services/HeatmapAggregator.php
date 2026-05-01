<?php

namespace App\Services;

use App\Models\Incident;
use App\Models\Monitor;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Read-only aggregator over the incidents table. Returns a daily bucket
 * for every day in the window so the calendar heatmap can render with a
 * single map() over the result.
 */
class HeatmapAggregator
{
    /**
     * @return list<array{date: string, count: int}>
     */
    public function dailyIncidentCounts(Monitor $monitor, CarbonInterface $from, CarbonInterface $to): array
    {
        $start = CarbonImmutable::parse($from)->startOfDay();
        $end = CarbonImmutable::parse($to)->endOfDay();

        $countsByDate = Incident::query()
            ->where('monitor_id', $monitor->id)
            ->whereBetween('started_at', [$start, $end])
            ->selectRaw('DATE(started_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $days = [];
        $cursor = $start;
        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $cursor->toDateString();
            $days[] = [
                'date' => $key,
                'count' => (int) ($countsByDate[$key] ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $days;
    }
}
