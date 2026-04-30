<?php

namespace App\Http\Controllers;

use App\Http\Requests\MonitorNotificationDeliveryIndexRequest;
use App\Http\Resources\NotificationDeliveryResource;
use App\Models\Monitor;
use App\Models\NotificationDelivery;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MonitorNotificationDeliveryController extends Controller
{
    public function index(MonitorNotificationDeliveryIndexRequest $request, Monitor $monitor): AnonymousResourceCollection
    {
        $this->authorize('view', $monitor);

        $status = $request->validated('status', 'all');

        $query = NotificationDelivery::query()
            ->with(['channel:id,name,type', 'incident:id,started_at,resolved_at'])
            ->where('team_id', $monitor->team_id)
            ->where('monitor_id', $monitor->id)
            ->orderByDesc('dispatched_at');

        if (in_array($status, ['delivered', 'failed'], true)) {
            $query->where('status', $status);
        }

        $paginator = $query->paginate(20)->withQueryString();

        return NotificationDeliveryResource::collection($paginator);
    }
}
