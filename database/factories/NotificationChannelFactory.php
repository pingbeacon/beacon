<?php

namespace Database\Factories;

use App\Models\NotificationChannel;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationChannel>
 */
class NotificationChannelFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'team_id' => fn (array $attributes) => User::find($attributes['user_id'])?->current_team_id,
            'name' => fake()->words(2, true),
            'type' => 'email',
            'configuration' => ['email' => fake()->safeEmail()],
            'is_enabled' => true,
        ];
    }

    public function slack(): static
    {
        return $this->state(fn () => [
            'type' => 'slack',
            'configuration' => ['webhook_url' => 'https://hooks.slack.com/services/test'],
        ]);
    }

    public function discord(): static
    {
        return $this->state(fn () => [
            'type' => 'discord',
            'configuration' => ['webhook_url' => 'https://discord.com/api/webhooks/test'],
        ]);
    }

    public function telegram(): static
    {
        return $this->state(fn () => [
            'type' => 'telegram',
            'configuration' => ['bot_token' => 'test-token', 'chat_id' => '12345'],
        ]);
    }
}
