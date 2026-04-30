<?php

namespace App\Http\Requests;

use App\Models\Monitor;
use App\Models\NotificationRoute;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ReorderNotificationRoutesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $monitor = $this->route('monitor');

        if (! $monitor instanceof Monitor || $this->user() === null) {
            return false;
        }

        return $monitor->team_id === $this->user()->current_team_id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string|Closure>
     */
    public function rules(): array
    {
        return [
            'order' => ['required', 'array', 'distinct', $this->matchesMonitorRoutes()],
            'order.*' => ['integer'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'order.required' => 'A list of route IDs is required.',
            'order.array' => 'The list of route IDs must be an array.',
            'order.*.integer' => 'Each route ID must be an integer.',
            'order.*.distinct' => 'Route IDs cannot be repeated.',
        ];
    }

    private function matchesMonitorRoutes(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $monitor = $this->route('monitor');

            if (! $monitor instanceof Monitor || ! is_array($value)) {
                $fail('Invalid reorder payload.');

                return;
            }

            $expected = NotificationRoute::query()
                ->where('monitor_id', $monitor->id)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values()
                ->all();

            $provided = collect($value)
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values()
                ->all();

            if ($expected !== $provided) {
                $fail('The order must contain every existing route ID for this monitor exactly once.');
            }
        };
    }
}
