<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStatusPageRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $statusPage = $this->route('status_page');

        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('status_pages', 'slug')->ignore($statusPage?->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_published' => ['sometimes', 'boolean'],
            'monitor_ids' => ['nullable', 'array'],
            'monitor_ids.*' => ['integer', Rule::exists('monitors', 'id')->where('team_id', $this->user()->current_team_id)],
            'logo' => ['nullable', 'image', 'max:2048'],
            'favicon' => ['nullable', 'image', 'max:1024'],
            'primary_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'background_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'text_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'custom_css' => [
                'nullable',
                'string',
                'max:10240',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value && preg_match('/(@import|url\s*\()/i', $value)) {
                        $fail('The custom CSS must not contain @import or url() directives.');
                    }
                },
            ],
            'header_text' => ['nullable', 'string', 'max:1000'],
            'footer_text' => ['nullable', 'string', 'max:1000'],
            'custom_domain' => ['nullable', 'string', 'max:255', Rule::unique('status_pages', 'custom_domain')->ignore($statusPage?->id)],
            'show_powered_by' => ['sometimes', 'boolean'],
        ];
    }
}
