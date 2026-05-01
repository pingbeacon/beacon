<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonitorIncidentHeatmapRequest;
use App\Models\Monitor;
use App\Services\HeatmapAggregator;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;

class MonitorIncidentHeatmapController extends Controller
{
    public function __construct(public HeatmapAggregator $aggregator = new HeatmapAggregator) {}

    public function __invoke(MonitorIncidentHeatmapRequest $request, Monitor $monitor): JsonResponse
    {
        $this->authorize('view', $monitor);

        $days = $request->days();
        $to = CarbonImmutable::now();
        $from = $to->subDays($days - 1);

        $rows = $this->aggregator->dailyIncidentCounts($monitor, $from, $to);

        $counts = array_column($rows, 'count');
        $incidentDays = count(array_filter($counts, fn ($n) => $n > 0));

        return response()->json([
            'days' => $rows,
            'summary' => [
                'incident_days' => $incidentDays,
                'clean_days' => count($rows) - $incidentDays,
                'max_day' => $counts === [] ? 0 : (int) max($counts),
                'total' => array_sum($counts),
            ],
        ]);
    }
}
