<?php

namespace App\Http\Controllers;

use App\Models\Monitor;
use App\Models\MonitorGroup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MonitorGroupReorderController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'groups' => ['nullable', 'array'],
            'groups.*.id' => ['required', 'integer', Rule::exists('monitor_groups', 'id')->where('team_id', auth()->user()->current_team_id)],
            'groups.*.sort_order' => ['required', 'integer', 'min:0'],
            'groups.*.parent_id' => ['nullable', 'integer', Rule::exists('monitor_groups', 'id')->where('team_id', auth()->user()->current_team_id)],
            'monitors' => ['nullable', 'array'],
            'monitors.*.id' => ['required', 'integer', Rule::exists('monitors', 'id')->where('team_id', auth()->user()->current_team_id)],
            'monitors.*.sort_order' => ['required', 'integer', 'min:0'],
            'monitors.*.monitor_group_id' => ['nullable', 'integer', Rule::exists('monitor_groups', 'id')->where('team_id', auth()->user()->current_team_id)],
        ]);

        foreach ($validated['groups'] ?? [] as $group) {
            MonitorGroup::where('id', $group['id'])
                ->where('team_id', auth()->user()->current_team_id)
                ->update([
                    'sort_order' => $group['sort_order'],
                    'parent_id' => $group['parent_id'] ?? null,
                ]);
        }

        foreach ($validated['monitors'] ?? [] as $monitor) {
            Monitor::where('id', $monitor['id'])
                ->where('team_id', auth()->user()->current_team_id)
                ->update([
                    'sort_order' => $monitor['sort_order'],
                    'monitor_group_id' => $monitor['monitor_group_id'] ?? null,
                ]);
        }

        return back();
    }
}
