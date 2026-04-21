<?php

namespace App\Jobs;

use App\Events\SslCertificateChecked;
use App\Models\Monitor;
use App\Services\SslCertificateChecker;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckSslCertificateJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public Monitor $monitor)
    {
        $this->onQueue('ssl');
    }

    public function handle(SslCertificateChecker $checker): void
    {
        if (! $this->monitor->url) {
            return;
        }

        $result = $checker->check($this->monitor->url);

        $sslCert = $this->monitor->sslCertificate()->updateOrCreate(
            ['monitor_id' => $this->monitor->id],
            [
                'issuer' => $result->issuer,
                'subject' => $result->subject,
                'valid_from' => $result->validFrom,
                'valid_to' => $result->validTo,
                'fingerprint' => $result->fingerprint,
                'days_until_expiry' => $result->daysUntilExpiry,
                'is_valid' => $result->isValid,
                'error_message' => $result->errorMessage,
                'last_checked_at' => now(),
            ],
        );

        SslCertificateChecked::dispatch($this->monitor, $sslCert);

        $thresholds = $this->monitor->ssl_expiry_notification_days ?? [];
        foreach ($thresholds as $days) {
            if ($sslCert->isExpiringSoon((int) $days)) {
                foreach ($this->monitor->notificationChannels as $channel) {
                    SendNotificationJob::dispatch(
                        $channel,
                        $this->monitor,
                        'warning',
                        "SSL certificate expires in {$sslCert->days_until_expiry} days",
                    )->onQueue('notifications');
                }

                break;
            }
        }
    }
}
