<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkMonitorActionRequest;
use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class BulkPauseMonitorsController extends Controller
{
    public function __invoke(BulkMonitorActionRequest $request): RedirectResponse
    {
        Monitor::query()
            ->whereIn('id', $request->validated('monitor_ids'))
            ->where('team_id', auth()->user()->current_team_id)
            ->update([
                'is_active' => false,
                'status' => 'paused',
            ]);

        flash(__('Monitors paused successfully.'));

        return back();
    }
}
