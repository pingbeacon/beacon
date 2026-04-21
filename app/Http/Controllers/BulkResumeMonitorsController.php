<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkMonitorActionRequest;
use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class BulkResumeMonitorsController extends Controller
{
    public function __invoke(BulkMonitorActionRequest $request): RedirectResponse
    {
        Monitor::query()
            ->whereIn('id', $request->validated('monitor_ids'))
            ->where('team_id', auth()->user()->current_team_id)
            ->update([
                'is_active' => true,
                'status' => 'pending',
            ]);

        flash(__('Monitors resumed successfully.'));

        return back();
    }
}
