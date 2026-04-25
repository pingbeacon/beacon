<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreApiTokenRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'team_id' => ['required', 'integer', 'exists:teams,id'],
            'scopes' => ['required', 'array', 'min:1'],
            'scopes.*' => ['string', 'in:monitors:read,monitors:write,heartbeats:read,status-pages:read,status-pages:write,incidents:read,tags:read'],
            'expires_at' => ['nullable', 'string', 'in:30d,90d,1y'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Token name is required.',
            'team_id.required' => 'Please select a team.',
            'team_id.exists' => 'The selected team is invalid.',
            'scopes.required' => 'Select at least one scope.',
            'scopes.min' => 'Select at least one scope.',
            'scopes.*.in' => 'One or more selected scopes are invalid.',
            'expires_at.in' => 'Expiration must be one of: 30d, 90d, or 1y.',
        ];
    }
}
