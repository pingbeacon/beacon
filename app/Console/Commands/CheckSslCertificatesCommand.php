<?php

namespace App\Console\Commands;

use App\Jobs\CheckSslCertificateJob;
use App\Models\Monitor;
use Illuminate\Console\Command;

class CheckSslCertificatesCommand extends Command
{
    protected $signature = 'monitors:check-ssl';

    protected $description = 'Dispatch SSL certificate check jobs for all HTTP monitors with SSL monitoring enabled';

    public function handle(): void
    {
        $monitors = Monitor::query()
            ->where('type', 'http')
            ->where('ssl_monitoring_enabled', true)
            ->where('is_active', true)
            ->get();

        $count = $monitors->count();
        $this->info("Dispatching SSL checks for {$count} monitor(s)...");

        foreach ($monitors as $monitor) {
            CheckSslCertificateJob::dispatch($monitor);
        }

        $this->info('Done.');
    }
}
