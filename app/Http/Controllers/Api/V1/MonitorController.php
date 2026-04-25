<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreMonitorRequest;
use App\Http\Requests\Api\V1\UpdateMonitorRequest;
use App\Http\Resources\Api\V1\MonitorResource;
use App\Models\Monitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MonitorController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->tokenCan('monitors:read'), 403, 'Insufficient token scope.');

        $monitors = Monitor::query()
            ->where('team_id', $request->user()->current_team_id)
            ->latest()
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return MonitorResource::collection($monitors);
    }

    public function store(StoreMonitorRequest $request): JsonResponse
    {
        abort_unless($request->user()->tokenCan('monitors:write'), 403, 'Insufficient token scope.');
        $this->authorize('create', Monitor::class);

        $validated = $request->validated();

        $monitor = Monitor::query()->create([
            ...$validated,
            'user_id' => $request->user()->id,
            'team_id' => $request->user()->current_team_id,
            'status' => 'pending',
        ]);

        return MonitorResource::make($monitor)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Monitor $monitor): JsonResponse
    {
        abort_unless($request->user()->tokenCan('monitors:read'), 403, 'Insufficient token scope.');
        $this->authorize('view', $monitor);

        return MonitorResource::make($monitor)->response();
    }

    public function update(UpdateMonitorRequest $request, Monitor $monitor): JsonResponse
    {
        abort_unless($request->user()->tokenCan('monitors:write'), 403, 'Insufficient token scope.');
        $this->authorize('update', $monitor);

        $monitor->update($request->validated());

        return MonitorResource::make($monitor->fresh())->response();
    }

    public function destroy(Request $request, Monitor $monitor): JsonResponse
    {
        abort_unless($request->user()->tokenCan('monitors:write'), 403, 'Insufficient token scope.');
        $this->authorize('delete', $monitor);

        $monitor->delete();

        return response()->json(null, 204);
    }
}
