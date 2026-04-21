<?php

namespace App\Http\Controllers;

use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class MonitorToggleController extends Controller
{
    /**
     * Toggle the active state of the specified monitor.
     */
    public function __invoke(Monitor $monitor): RedirectResponse
    {
        $this->authorize('update', $monitor);

        $isNowActive = ! $monitor->is_active;

        $monitor->update([
            'is_active' => $isNowActive,
            'status' => $isNowActive ? 'pending' : 'paused',
        ]);

        $message = $isNowActive
            ? __('Monitor resumed successfully.')
            : __('Monitor paused successfully.');

        flash($message);

        return back();
    }
}
