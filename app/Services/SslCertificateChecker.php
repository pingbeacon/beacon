<?php

namespace App\Services;

use App\DTOs\SslCheckResult;
use Carbon\CarbonImmutable;

class SslCertificateChecker
{
    public function check(string $url): SslCheckResult
    {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';
        $port = $parsed['port'] ?? 443;

        if (empty($host)) {
            return new SslCheckResult(
                issuer: null,
                subject: null,
                validFrom: null,
                validTo: null,
                fingerprint: null,
                daysUntilExpiry: null,
                isValid: false,
                errorMessage: 'Invalid URL: could not parse host',
            );
        }

        $context = stream_context_create([
            'ssl' => [
                'capture_peer_cert' => true,
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
                'SNI_enabled' => true,
                'peer_name' => $host,
            ],
        ]);

        $errno = 0;
        $errstr = '';

        $client = @stream_socket_client(
            "ssl://{$host}:{$port}",
            $errno,
            $errstr,
            30,
            STREAM_CLIENT_CONNECT,
            $context,
        );

        if (! $client) {
            return new SslCheckResult(
                issuer: null,
                subject: null,
                validFrom: null,
                validTo: null,
                fingerprint: null,
                daysUntilExpiry: null,
                isValid: false,
                errorMessage: "SSL connection failed: {$errstr} ({$errno})",
            );
        }

        $params = stream_context_get_params($client);
        fclose($client);

        $cert = $params['options']['ssl']['peer_certificate'] ?? null;

        if (! $cert) {
            return new SslCheckResult(
                issuer: null,
                subject: null,
                validFrom: null,
                validTo: null,
                fingerprint: null,
                daysUntilExpiry: null,
                isValid: false,
                errorMessage: 'Could not retrieve peer certificate',
            );
        }

        $certInfo = openssl_x509_parse($cert);

        if (! $certInfo) {
            return new SslCheckResult(
                issuer: null,
                subject: null,
                validFrom: null,
                validTo: null,
                fingerprint: null,
                daysUntilExpiry: null,
                isValid: false,
                errorMessage: 'Could not parse certificate',
            );
        }

        openssl_x509_export($cert, $certPem);
        $fingerprint = openssl_x509_fingerprint($cert, 'sha256');

        $validFrom = CarbonImmutable::createFromTimestamp($certInfo['validFrom_time_t']);
        $validTo = CarbonImmutable::createFromTimestamp($certInfo['validTo_time_t']);
        $daysUntilExpiry = (int) now()->diffInDays($validTo, false);

        $issuer = $certInfo['issuer']['O'] ?? $certInfo['issuer']['CN'] ?? 'Unknown';
        $subject = $certInfo['subject']['CN'] ?? 'Unknown';

        return new SslCheckResult(
            issuer: $issuer,
            subject: $subject,
            validFrom: $validFrom,
            validTo: $validTo,
            fingerprint: $fingerprint ?: null,
            daysUntilExpiry: $daysUntilExpiry,
            isValid: $daysUntilExpiry > 0,
        );
    }
}
