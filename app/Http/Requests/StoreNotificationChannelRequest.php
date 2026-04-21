<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNotificationChannelRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $type = $this->input('type');

        $configurationRules = match ($type) {
            'email' => [
                'configuration.email' => ['required', 'email'],
            ],
            'slack' => [
                'configuration.webhook_url' => ['required', 'url'],
            ],
            'discord' => [
                'configuration.webhook_url' => ['required', 'url'],
            ],
            'telegram' => [
                'configuration.bot_token' => ['required', 'string'],
                'configuration.chat_id' => ['required', 'string'],
            ],
            'webhook' => [
                'configuration.url' => ['required', 'url'],
                'configuration.secret' => ['nullable', 'string'],
                'configuration.custom_headers' => ['nullable', 'string'],
            ],
            default => [],
        };

        return array_merge([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['email', 'slack', 'discord', 'telegram', 'webhook'])],
            'is_enabled' => ['sometimes', 'boolean'],
            'configuration' => ['required', 'array'],
        ], $configurationRules);
    }
}
