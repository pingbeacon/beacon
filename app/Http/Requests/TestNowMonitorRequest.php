<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TestNowMonitorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['http', 'tcp', 'ping', 'dns'])],
            'name' => ['nullable', 'string', 'max:255'],
            'url' => ['required_if:type,http', 'nullable', 'url'],
            'host' => ['required_if:type,tcp', 'required_if:type,ping', 'required_if:type,dns', 'nullable', 'string'],
            'port' => ['required_if:type,tcp', 'nullable', 'integer', 'between:1,65535'],
            'dns_record_type' => ['required_if:type,dns', 'nullable', Rule::in(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'])],
            'method' => ['sometimes', Rule::in(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])],
            'body' => ['nullable', 'string'],
            'headers' => ['nullable', 'array'],
            'accepted_status_codes' => ['nullable', 'array'],
            'accepted_status_codes.*' => ['integer'],
            'timeout' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'retry_count' => ['sometimes', 'integer', 'min:0', 'max:10'],
            'interval' => ['sometimes', 'integer', 'min:10', 'max:3600'],
        ];
    }
}
