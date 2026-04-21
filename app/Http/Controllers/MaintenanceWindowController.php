<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMaintenanceWindowRequest;
use App\Http\Requests\UpdateMaintenanceWindowRequest;
use App\Models\MaintenanceWindow;
use App\Models\Monitor;
use App\Models\MonitorGroup;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;

class MaintenanceWindowController extends Controller
{
    public function index(): Response
    {
        $windows = MaintenanceWindow::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->with(['monitors', 'monitorGroups'])
            ->latest()
            ->get();

        return inertia('maintenance-windows/index', [
            'maintenanceWindows' => $windows,
        ]);
    }

    public function create(): Response
    {
        $monitors = Monitor::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        $groups = MonitorGroup::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return inertia('maintenance-windows/create', [
            'monitors' => $monitors,
            'groups' => $groups,
        ]);
    }

    public function store(StoreMaintenanceWindowRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $window = MaintenanceWindow::query()->create([
            ...$validated,
            'user_id' => auth()->id(),
            'team_id' => auth()->user()->current_team_id,
        ]);

        if (isset($validated['monitor_ids'])) {
            $window->monitors()->sync($validated['monitor_ids']);
        }

        if (isset($validated['monitor_group_ids'])) {
            $window->monitorGroups()->sync($validated['monitor_group_ids']);
        }

        flash(__('Maintenance window created successfully.'));

        return to_route('maintenance-windows.index');
    }

    public function edit(MaintenanceWindow $maintenanceWindow): Response
    {
        $this->authorize('update', $maintenanceWindow);

        $maintenanceWindow->load('monitors', 'monitorGroups');

        $monitors = Monitor::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        $groups = MonitorGroup::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return inertia('maintenance-windows/edit', [
            'maintenanceWindow' => $maintenanceWindow,
            'monitors' => $monitors,
            'groups' => $groups,
        ]);
    }

    public function update(UpdateMaintenanceWindowRequest $request, MaintenanceWindow $maintenanceWindow): RedirectResponse
    {
        $this->authorize('update', $maintenanceWindow);

        $validated = $request->validated();

        $maintenanceWindow->update($validated);
        $maintenanceWindow->monitors()->sync($validated['monitor_ids'] ?? []);
        $maintenanceWindow->monitorGroups()->sync($validated['monitor_group_ids'] ?? []);

        flash(__('Maintenance window updated successfully.'));

        return to_route('maintenance-windows.index');
    }

    public function destroy(MaintenanceWindow $maintenanceWindow): RedirectResponse
    {
        $this->authorize('delete', $maintenanceWindow);

        $maintenanceWindow->delete();

        flash(__('Maintenance window deleted successfully.'));

        return to_route('maintenance-windows.index');
    }
}
