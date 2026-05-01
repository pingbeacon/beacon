<?php

namespace App\Http\Requests;

use App\Models\Monitor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DryRunRequest extends FormRequest
{
    public function authorize(): bool
    {
        $monitor = $this->route('monitor');

        return $monitor instanceof Monitor && $this->user()?->can('view', $monitor);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:status,latency,body,header,content_type'],
            'expression' => ['required', 'string', 'max:512'],
            'source' => ['required', 'string', 'in:heartbeat,pasted'],
            'heartbeat_id' => ['required_if:source,heartbeat', 'integer'],
            'response' => ['required_if:source,pasted', 'array'],
            'response.status_code' => ['nullable', 'integer'],
            'response.latency_ms' => ['nullable', 'integer'],
            'response.body' => ['nullable', 'string'],
            'response.headers' => ['nullable', 'array'],
            'response.content_type' => ['nullable', 'string'],
        ];
    }
}
