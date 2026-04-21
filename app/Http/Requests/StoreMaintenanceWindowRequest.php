<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceWindowRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'timezone' => ['required', 'string', 'timezone'],
            'is_recurring' => ['sometimes', 'boolean'],
            'recurrence_type' => ['required_if:is_recurring,true', 'nullable', Rule::in(['daily', 'weekly', 'monthly'])],
            'recurrence_days' => ['nullable', 'array'],
            'recurrence_days.*' => ['integer'],
            'is_active' => ['sometimes', 'boolean'],
            'monitor_ids' => ['nullable', 'array'],
            'monitor_ids.*' => ['integer', Rule::exists('monitors', 'id')->where('team_id', $this->user()->current_team_id)],
            'monitor_group_ids' => ['nullable', 'array'],
            'monitor_group_ids.*' => ['integer', Rule::exists('monitor_groups', 'id')->where('team_id', $this->user()->current_team_id)],
        ];
    }
}
