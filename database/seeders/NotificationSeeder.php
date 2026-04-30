<?php

namespace Database\Seeders;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\NotificationRoute;
use App\Models\User;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', 'test@example.com')->firstOrFail();

        $channels = $this->seedChannels($user);
        $monitors = Monitor::query()
            ->where('team_id', $user->current_team_id)
            ->get();

        foreach ($monitors as $monitor) {
            $monitor->notificationChannels()->syncWithoutDetaching([
                $channels['email']->id,
                $channels['slack']->id,
            ]);

            $this->seedRoutesFor($monitor, $channels);
        }
    }

    /**
     * @return array<string, NotificationChannel>
     */
    private function seedChannels(User $user): array
    {
        $configs = [
            'email' => [
                'type' => 'email',
                'name' => 'Team Email',
                'configuration' => ['email' => 'oncall@example.com'],
            ],
            'slack' => [
                'type' => 'slack',
                'name' => '#alerts (Slack)',
                'configuration' => ['webhook_url' => 'https://hooks.slack.com/services/seed/example'],
            ],
            'discord' => [
                'type' => 'discord',
                'name' => 'Discord — #ops',
                'configuration' => ['webhook_url' => 'https://discord.com/api/webhooks/seed/example'],
            ],
            'webhook' => [
                'type' => 'webhook',
                'name' => 'PagerDuty webhook',
                'configuration' => ['url' => 'https://events.pagerduty.com/seed'],
            ],
        ];

        $created = [];
        foreach ($configs as $key => $config) {
            $created[$key] = NotificationChannel::query()->updateOrCreate(
                [
                    'team_id' => $user->current_team_id,
                    'name' => $config['name'],
                ],
                [
                    'user_id' => $user->id,
                    'type' => $config['type'],
                    'configuration' => $config['configuration'],
                    'is_enabled' => true,
                ],
            );
        }

        return $created;
    }

    /**
     * @param  array<string, NotificationChannel>  $channels
     */
    private function seedRoutesFor(Monitor $monitor, array $channels): void
    {
        if (NotificationRoute::query()->where('monitor_id', $monitor->id)->exists()) {
            return;
        }

        NotificationRoute::query()->create([
            'monitor_id' => $monitor->id,
            'team_id' => $monitor->team_id,
            'name' => 'Down → Slack + Email',
            'priority' => 10,
            'conditions' => ['severity_filter' => null, 'status_filter' => ['down']],
            'channel_ids' => [$channels['slack']->id, $channels['email']->id],
            'is_active' => true,
        ]);

        NotificationRoute::query()->create([
            'monitor_id' => $monitor->id,
            'team_id' => $monitor->team_id,
            'name' => 'Recovery → Slack',
            'priority' => 20,
            'conditions' => ['severity_filter' => null, 'status_filter' => ['up']],
            'channel_ids' => [$channels['slack']->id],
            'is_active' => true,
        ]);

        NotificationRoute::query()->create([
            'monitor_id' => $monitor->id,
            'team_id' => $monitor->team_id,
            'name' => 'Critical escalation → Webhook',
            'priority' => 30,
            'conditions' => ['severity_filter' => ['critical'], 'status_filter' => null],
            'channel_ids' => [$channels['webhook']->id],
            'is_active' => true,
        ]);
    }
}
