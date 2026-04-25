<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStatusPageRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('status_pages', 'slug')->ignore($statusPage?->id),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'is_published' => ['sometimes', 'boolean'],
            'header_text' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'footer_text' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'custom_domain' => ['sometimes', 'nullable', 'string', 'max:255', Rule::unique('status_pages', 'custom_domain')->ignore($statusPage?->id)],
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
            'slug.alpha_dash' => 'The slug may only contain letters, numbers, dashes, and underscores.',
            'slug.unique' => 'This slug is already in use.',
            'custom_domain.unique' => 'This custom domain is already in use.',
        ];
    }
}
