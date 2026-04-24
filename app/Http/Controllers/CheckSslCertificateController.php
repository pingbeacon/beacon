<?php

namespace App\Http\Controllers;

use App\Jobs\CheckSslCertificateJob;
use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class CheckSslCertificateController extends Controller
{
    public function __invoke(Monitor $monitor): RedirectResponse
    {
        $this->authorize('update', $monitor);

        abort_unless($monitor->type === 'http' && $monitor->ssl_monitoring_enabled, 422);

        CheckSslCertificateJob::dispatch($monitor);

        flash(__('SSL scan queued.'));

        return back();
    }
}
