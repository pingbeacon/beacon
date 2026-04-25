<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStatusPageRequest extends FormRequest
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
            'header_text' => ['nullable', 'string', 'max:1000'],
            'footer_text' => ['nullable', 'string', 'max:1000'],
            'custom_domain' => ['nullable', 'string', 'max:255', Rule::unique('status_pages', 'custom_domain')->ignore($statusPage?->id)],
            'show_powered_by' => ['sometimes', 'boolean'],
        ];
    }
}
