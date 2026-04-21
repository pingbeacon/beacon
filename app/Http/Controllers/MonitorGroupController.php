<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMonitorGroupRequest;
use App\Http\Requests\UpdateMonitorGroupRequest;
use App\Models\MonitorGroup;
use Illuminate\Http\RedirectResponse;

class MonitorGroupController extends Controller
{
    public function store(StoreMonitorGroupRequest $request): RedirectResponse
    {
        MonitorGroup::query()->create([
            ...$request->validated(),
            'user_id' => auth()->id(),
            'team_id' => auth()->user()->current_team_id,
        ]);

        flash(__('Group created successfully.'));

        return back();
    }

    public function update(UpdateMonitorGroupRequest $request, MonitorGroup $monitorGroup): RedirectResponse
    {
        $this->authorize('update', $monitorGroup);

        $monitorGroup->update($request->validated());

        flash(__('Group updated successfully.'));

        return back();
    }

    public function destroy(MonitorGroup $monitorGroup): RedirectResponse
    {
        $this->authorize('delete', $monitorGroup);

        $monitorGroup->monitors()->update(['monitor_group_id' => null]);
        $monitorGroup->children()->update(['parent_id' => null]);
        $monitorGroup->delete();

        flash(__('Group deleted successfully.'));

        return back();
    }
}
