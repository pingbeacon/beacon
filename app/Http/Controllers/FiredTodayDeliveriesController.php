<?php

namespace App\Http\Controllers;

use App\Models\NotificationDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FiredTodayDeliveriesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $teamId = $request->user()->current_team_id;

        if ($teamId === null) {
            return response()->json([]);
        }

        $rows = NotificationDelivery::query()
            ->selectRaw('channel_id, count(*) as count')
            ->where('team_id', $teamId)
            ->where('dispatched_at', '>=', now()->startOfDay())
            ->groupBy('channel_id')
            ->orderBy('channel_id')
            ->get()
            ->map(fn ($row) => [
                'channel_id' => (int) $row->channel_id,
                'count' => (int) $row->count,
            ]);

        return response()->json($rows);
    }
}
