<?php

namespace App\Http\Requests;

use App\Models\Monitor;
use App\Services\Assertions\AssertionDsl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAssertionRequest extends FormRequest
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
            'type' => ['sometimes', 'string', 'in:status,latency,body,header,content_type'],
            'expression' => ['required_with:type', 'nullable', 'string', 'max:512', function (string $attribute, mixed $value, \Closure $fail) {
                if (! is_string($value)) {
                    return;
                }
                $type = $this->input('type', $this->route('assertion')?->type);
                if (! is_string($type)) {
                    return;
                }
                if (($error = AssertionDsl::tryParse($type, $value)) !== null) {
                    $fail($error);
                }
            }],
            'name' => ['nullable', 'string', 'max:120'],
            'severity' => ['sometimes', 'string', 'in:critical,warning,info'],
            'on_fail' => ['sometimes', 'string', 'in:open_incident,log_only'],
            'muted' => ['sometimes', 'boolean'],
            'tolerance' => ['sometimes', 'integer', 'min:0', 'max:60'],
        ];
    }
}
