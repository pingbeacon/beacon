<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkMonitorActionRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'monitor_ids' => ['required', 'array', 'min:1'],
            'monitor_ids.*' => ['integer', Rule::exists('monitors', 'id')->where('team_id', $this->user()->current_team_id)],
        ];
    }
}
