<?php

namespace App\Http\Controllers;

use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class MonitorRestoreController extends Controller
{
    /**
     * Restore a soft-deleted monitor.
     */
    public function __invoke(int $monitorId): RedirectResponse
    {
        $monitor = Monitor::onlyTrashed()->findOrFail($monitorId);

        $this->authorize('restore', $monitor);

        $monitor->restore();

        flash(__('Monitor restored successfully.'));

        return to_route('monitors.show', $monitor);
    }
}
