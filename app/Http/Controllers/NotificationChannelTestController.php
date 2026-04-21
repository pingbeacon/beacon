<?php

namespace App\Http\Controllers;

use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Services\Notifiers\DiscordNotifier;
use App\Services\Notifiers\EmailNotifier;
use App\Services\Notifiers\Notifier;
use App\Services\Notifiers\SlackNotifier;
use App\Services\Notifiers\TelegramNotifier;
use App\Services\Notifiers\WebhookNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NotificationChannelTestController extends Controller
{
    /**
     * Send a test notification via the given channel.
     */
    public function __invoke(Request $request, NotificationChannel $notificationChannel): RedirectResponse
    {
        $this->authorize('view', $notificationChannel);

        $monitor = Monitor::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->first();

        $notifier = $this->resolveNotifier($notificationChannel->type);

        $notifier->send(
            $notificationChannel,
            $monitor ?? new Monitor(['name' => 'Test Monitor', 'type' => 'http']),
            'up',
            "This is a test notification from UptimeRadar for channel \"{$notificationChannel->name}\".",
        );

        flash(__('Test notification sent successfully.'));

        return back();
    }

    private function resolveNotifier(string $type): Notifier
    {
        return match ($type) {
            'email' => new EmailNotifier,
            'slack' => new SlackNotifier,
            'discord' => new DiscordNotifier,
            'telegram' => new TelegramNotifier,
            'webhook' => new WebhookNotifier,
            default => throw new \InvalidArgumentException("Unknown channel type: {$type}"),
        };
    }
}
