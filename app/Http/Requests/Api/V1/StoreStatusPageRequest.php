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

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'A title is required.',
            'slug.required' => 'A slug is required.',
            'slug.alpha_dash' => 'Slug may only contain letters, numbers, dashes, and underscores.',
            'slug.unique' => 'This slug is already in use.',
            'custom_domain.unique' => 'This custom domain is already in use.',
            'is_published.boolean' => 'is_published must be true or false.',
            'show_powered_by.boolean' => 'show_powered_by must be true or false.',
        ];
    }
}
