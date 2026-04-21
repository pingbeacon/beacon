<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkMonitorActionRequest;
use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class BulkDeleteMonitorsController extends Controller
{
    public function __invoke(BulkMonitorActionRequest $request): RedirectResponse
    {
        Monitor::query()
            ->whereIn('id', $request->validated('monitor_ids'))
            ->where('team_id', auth()->user()->current_team_id)
            ->delete();

        flash(__('Monitors deleted successfully.'));

        return back();
    }
}
