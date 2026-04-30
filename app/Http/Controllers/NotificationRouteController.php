<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNotificationRouteRequest;
use App\Http\Requests\UpdateNotificationRouteRequest;
use App\Models\Monitor;
use App\Models\NotificationRoute;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationRouteController extends Controller
{
    public function store(StoreNotificationRouteRequest $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('view', $monitor);
        $this->authorize('create', NotificationRoute::class);
        $this->ensureSameTeam($monitor);

        NotificationRoute::query()->create([
            ...$request->validated(),
            'monitor_id' => $monitor->id,
            'team_id' => $monitor->team_id,
        ]);

        flash(__('Routing rule added.'));

        return back();
    }

    public function update(UpdateNotificationRouteRequest $request, Monitor $monitor, NotificationRoute $notificationRoute): RedirectResponse
    {
        $this->authorize('view', $monitor);
        $this->authorize('update', $notificationRoute);
        $this->ensureSameTeam($monitor);
        $this->ensureRouteBelongsToMonitor($monitor, $notificationRoute);

        $notificationRoute->update($request->validated());

        flash(__('Routing rule updated.'));

        return back();
    }

    public function destroy(Monitor $monitor, NotificationRoute $notificationRoute): RedirectResponse
    {
        $this->authorize('view', $monitor);
        $this->authorize('delete', $notificationRoute);
        $this->ensureRouteBelongsToMonitor($monitor, $notificationRoute);

        $notificationRoute->delete();

        flash(__('Routing rule removed.'));

        return back();
    }

    public function reorder(Request $request, Monitor $monitor): RedirectResponse
    {
        $this->authorize('view', $monitor);
        $this->authorize('create', NotificationRoute::class);
        $this->ensureSameTeam($monitor);

        $data = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['integer'],
        ]);

        foreach ($data['order'] as $index => $id) {
            NotificationRoute::query()
                ->where('id', $id)
                ->where('monitor_id', $monitor->id)
                ->update(['priority' => $index * 10]);
        }

        return back();
    }

    private function ensureSameTeam(Monitor $monitor): void
    {
        abort_if($monitor->team_id !== auth()->user()->current_team_id, 403);
    }

    private function ensureRouteBelongsToMonitor(Monitor $monitor, NotificationRoute $route): void
    {
        abort_if($route->monitor_id !== $monitor->id, 404);
    }
}
