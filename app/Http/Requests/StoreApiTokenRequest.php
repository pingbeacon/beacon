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
}
