<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;

class MonitorResource extends ApiResource
{
    private const SENSITIVE_HEADERS = [
        'authorization',
        'proxy-authorization',
        'cookie',
        'set-cookie',
        'api-key',
        'x-api-key',
        'x-auth-token',
        'x-access-token',
        'x-csrf-token',
    ];

    private const SENSITIVE_BODY_KEYS = [
        'password',
        'token',
        'api_key',
        'secret',
        'client_secret',
        'access_token',
        'refresh_token',
    ];

    /** @return array<string, string>|null */
    private function redactedHeaders(): ?array
    {
        if (! is_array($this->headers)) {
            return null;
        }

        return collect($this->headers)
            ->mapWithKeys(fn ($value, $key) => [
                $key => in_array(strtolower($key), self::SENSITIVE_HEADERS, true) ? '[REDACTED]' : $value,
            ])
            ->all();
    }

    private function redactedBody(): mixed
    {
        if (! is_string($this->body) || $this->body === '') {
            return $this->body;
        }

        $decoded = json_decode($this->body, true);

        if (! is_array($decoded)) {
            return $this->body;
        }

        $sanitized = collect($decoded)
            ->mapWithKeys(fn ($value, $key) => [
                $key => in_array(strtolower((string) $key), self::SENSITIVE_BODY_KEYS, true) ? '[REDACTED]' : $value,
            ])
            ->all();

        return json_encode($sanitized);
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'url' => $this->url,
            'host' => $this->host,
            'port' => $this->port,
            'dns_record_type' => $this->dns_record_type,
            'method' => $this->method,
            'body' => $this->redactedBody(),
            'headers' => $this->redactedHeaders(),
            'accepted_status_codes' => $this->accepted_status_codes,
            'interval' => $this->interval,
            'timeout' => $this->timeout,
            'retry_count' => $this->retry_count,
            'status' => $this->status,
            'is_active' => $this->is_active,
            'ssl_monitoring_enabled' => $this->ssl_monitoring_enabled,
            'last_checked_at' => $this->last_checked_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
