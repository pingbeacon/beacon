<?php

namespace App\Http\Requests;

use App\Models\Monitor;
use App\Services\Assertions\AssertionDsl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAssertionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $monitor = $this->route('monitor');

        return $monitor instanceof Monitor && $this->user()?->can('update', $monitor);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:status,latency,body,header,content_type'],
            'expression' => ['required', 'string', 'max:512', function (string $attribute, mixed $value, \Closure $fail) {
                $type = $this->input('type');
                if (! is_string($type) || ! is_string($value)) {
                    return;
                }
                if (($error = AssertionDsl::tryParse($type, $value)) !== null) {
                    $fail($error);
                }
            }],
            'name' => ['nullable', 'string', 'max:120'],
            'severity' => ['required', 'string', 'in:critical,warning,info'],
            'on_fail' => ['required', 'string', 'in:open_incident,log_only'],
            'muted' => ['sometimes', 'boolean'],
            'tolerance' => ['sometimes', 'integer', 'min:0', 'max:60'],
        ];
    }
}
