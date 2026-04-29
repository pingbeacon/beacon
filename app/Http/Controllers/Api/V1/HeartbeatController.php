<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\HeartbeatResource;
use App\Models\Heartbeat;
use App\Models\Monitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HeartbeatController extends Controller
{
    public function index(Request $request, Monitor $monitor): AnonymousResourceCollection
    {
        abort_unless($request->user()->tokenCan('heartbeats:read'), 403, 'Insufficient token scope.');
        $this->authorize('view', $monitor);

        $heartbeats = $monitor->heartbeats()
            ->latest()
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return HeartbeatResource::collection($heartbeats);
    }

    public function show(Request $request, Monitor $monitor, Heartbeat $heartbeat): JsonResponse
    {
        abort_unless($request->user()->tokenCan('heartbeats:read'), 403, 'Insufficient token scope.');
        $this->authorize('view', $monitor);

        abort_if($heartbeat->monitor_id !== $monitor->id, 404);

        return HeartbeatResource::make($heartbeat)->response();
    }
}
