<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;

class MonitorResource extends ApiResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    private const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'x-auth-token', 'cookie', 'proxy-authorization'];

    /** @return array<string, string>|null */
    private function redactedHeaders(): ?array
    {
        if (! is_array($this->headers)) {
            return $this->headers;
        }

        return collect($this->headers)
            ->mapWithKeys(fn ($value, $key) => [
                $key => in_array(strtolower($key), self::SENSITIVE_HEADERS) ? '[REDACTED]' : $value,
            ])
            ->all();
    }

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
            'body' => $this->body,
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
