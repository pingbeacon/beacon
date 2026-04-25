<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\IncidentResource;
use App\Models\Incident;
use App\Models\Monitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IncidentController extends Controller
{
    public function index(Request $request, Monitor $monitor): AnonymousResourceCollection
    {
        abort_unless($request->user()->tokenCan('incidents:read'), 403, 'Insufficient token scope.');
        $this->authorize('view', $monitor);

        $incidents = $monitor->incidents()
            ->latest('started_at')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return IncidentResource::collection($incidents);
    }

    public function show(Request $request, Monitor $monitor, Incident $incident): JsonResponse
    {
        abort_unless($request->user()->tokenCan('incidents:read'), 403, 'Insufficient token scope.');
        $this->authorize('view', $monitor);

        abort_if($incident->monitor_id !== $monitor->id, 404);

        return IncidentResource::make($incident)->response();
    }
}
