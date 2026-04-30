<?php

use App\Jobs\SendNotificationJob;
use App\Mail\MonitorStatusMail;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

// --- Guest redirects ---

test('guests are redirected to login for notification channels index', function () {
    $this->get('/notification-channels')->assertRedirect('/login');
});

test('guests are redirected to login for notification channels create', function () {
    $this->get('/notification-channels/create')->assertRedirect('/login');
});

test('guests are redirected to login for notification channels store', function () {
    $this->post('/notification-channels')->assertRedirect('/login');
});

test('guests are redirected to login for notification channels edit', function () {
    $channel = NotificationChannel::factory()->create();
    $this->get("/notification-channels/{$channel->id}/edit")->assertRedirect('/login');
});

test('guests are redirected to login for notification channels update', function () {
    $channel = NotificationChannel::factory()->create();
    $this->patch("/notification-channels/{$channel->id}")->assertRedirect('/login');
});

test('guests are redirected to login for notification channels destroy', function () {
    $channel = NotificationChannel::factory()->create();
    $this->delete("/notification-channels/{$channel->id}")->assertRedirect('/login');
});

test('guests are redirected to login for notification channels test', function () {
    $channel = NotificationChannel::factory()->create();
    $this->post("/notification-channels/{$channel->id}/test")->assertRedirect('/login');
});

// --- Index ---

test('authenticated user can view notification channels index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/notification-channels')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('notification-channels/index'));
});

test('notification channels index only shows authenticated users own channels', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    NotificationChannel::factory()->for($user)->create(['name' => 'My Channel']);
    NotificationChannel::factory()->for($other)->create(['name' => 'Other Channel']);

    $this->actingAs($user)
        ->get('/notification-channels')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('notification-channels/index')
                ->has('channels', 1)
                ->where('channels.0.name', 'My Channel')
        );
});

// --- Create ---

test('authenticated user can view notification channel create page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/notification-channels/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('notification-channels/create'));
});

// --- Store ---

test('user can create an email notification channel', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'My Email',
            'type' => 'email',
            'is_enabled' => true,
            'configuration' => ['email' => 'alerts@example.com'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/notification-channels');

    $channel = NotificationChannel::where('user_id', $user->id)->where('name', 'My Email')->first();
    expect($channel)->not->toBeNull();
    expect($channel->type)->toBe('email');
    expect($channel->configuration['email'])->toBe('alerts@example.com');
});

test('user can create a slack notification channel', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Slack Alerts',
            'type' => 'slack',
            'configuration' => ['webhook_url' => 'https://hooks.slack.com/services/abc123'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/notification-channels');

    expect(NotificationChannel::where('user_id', $user->id)->where('type', 'slack')->exists())->toBeTrue();
});

test('user can create a discord notification channel', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Discord Alerts',
            'type' => 'discord',
            'configuration' => ['webhook_url' => 'https://discord.com/api/webhooks/abc123'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/notification-channels');

    expect(NotificationChannel::where('user_id', $user->id)->where('type', 'discord')->exists())->toBeTrue();
});

test('user can create a telegram notification channel', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Telegram Alerts',
            'type' => 'telegram',
            'configuration' => ['bot_token' => 'my-bot-token', 'chat_id' => '12345'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/notification-channels');

    expect(NotificationChannel::where('user_id', $user->id)->where('type', 'telegram')->exists())->toBeTrue();
});

// --- Validation errors ---

test('notification channel store fails when name is missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'type' => 'email',
            'configuration' => ['email' => 'test@example.com'],
        ])
        ->assertSessionHasErrors('name');
});

test('notification channel store fails with invalid type', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Bad Channel',
            'type' => 'whatsapp',
            'configuration' => [],
        ])
        ->assertSessionHasErrors('type');
});

test('email channel validation requires valid email', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Email',
            'type' => 'email',
            'configuration' => ['email' => 'not-an-email'],
        ])
        ->assertSessionHasErrors('configuration.email');
});

test('slack channel validation requires webhook url', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Slack',
            'type' => 'slack',
            'configuration' => [],
        ])
        ->assertSessionHasErrors('configuration.webhook_url');
});

test('discord channel validation requires webhook url', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Discord',
            'type' => 'discord',
            'configuration' => ['webhook_url' => 'not-a-url'],
        ])
        ->assertSessionHasErrors('configuration.webhook_url');
});

test('telegram channel validation requires bot token and chat id', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/notification-channels', [
            'name' => 'Telegram',
            'type' => 'telegram',
            'configuration' => [],
        ])
        ->assertSessionHasErrors(['configuration.bot_token', 'configuration.chat_id']);
});

// --- Edit ---

test('user can view edit page for their own channel', function () {
    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();

    $this->actingAs($user)
        ->get("/notification-channels/{$channel->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('notification-channels/edit'));
});

test('user cannot view edit page for another users channel', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $channel = NotificationChannel::factory()->for($other)->create();

    $this->actingAs($user)
        ->get("/notification-channels/{$channel->id}/edit")
        ->assertForbidden();
});

// --- Update ---

test('user can update their own notification channel', function () {
    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create(['name' => 'Old Name']);

    $this->actingAs($user)
        ->patch("/notification-channels/{$channel->id}", [
            'name' => 'New Name',
            'type' => 'email',
            'is_enabled' => true,
            'configuration' => ['email' => 'new@example.com'],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($channel->fresh()->name)->toBe('New Name');
    expect($channel->fresh()->configuration['email'])->toBe('new@example.com');
});

test('user cannot update another users notification channel', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $channel = NotificationChannel::factory()->for($other)->create(['name' => 'Original']);

    $this->actingAs($user)
        ->patch("/notification-channels/{$channel->id}", [
            'name' => 'Hacked',
            'type' => 'email',
            'configuration' => ['email' => 'hacked@example.com'],
        ])
        ->assertForbidden();

    expect($channel->fresh()->name)->toBe('Original');
});

// --- Destroy ---

test('user can delete their own notification channel', function () {
    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete("/notification-channels/{$channel->id}")
        ->assertRedirect('/notification-channels');

    expect($channel->fresh())->toBeNull();
});

test('user cannot delete another users notification channel', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $channel = NotificationChannel::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete("/notification-channels/{$channel->id}")
        ->assertForbidden();

    expect($channel->fresh())->not->toBeNull();
});

// --- Test notification endpoint ---

test('user can send a test notification for their slack channel', function () {
    Http::fake(['https://hooks.slack.com/*' => Http::response([], 200)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->slack()->for($user)->create();

    $this->actingAs($user)
        ->post("/notification-channels/{$channel->id}/test")
        ->assertRedirect();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'hooks.slack.com'));
});

test('user can send a test notification for their discord channel', function () {
    Http::fake(['https://discord.com/*' => Http::response([], 204)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->discord()->for($user)->create();

    $this->actingAs($user)
        ->post("/notification-channels/{$channel->id}/test")
        ->assertRedirect();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'discord.com'));
});

test('user can send a test notification for their telegram channel', function () {
    Http::fake(['https://api.telegram.org/*' => Http::response(['ok' => true], 200)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->telegram()->for($user)->create();

    $this->actingAs($user)
        ->post("/notification-channels/{$channel->id}/test")
        ->assertRedirect();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'api.telegram.org'));
});

test('user can send a test notification for their email channel', function () {
    Mail::fake();

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();

    $this->actingAs($user)
        ->post("/notification-channels/{$channel->id}/test")
        ->assertRedirect();

    Mail::assertSent(MonitorStatusMail::class);
});

test('user cannot send test notification for another users channel', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $channel = NotificationChannel::factory()->for($other)->create();

    $this->actingAs($user)
        ->post("/notification-channels/{$channel->id}/test")
        ->assertForbidden();
});

// --- SendNotificationJob ---

test('send notification job dispatches to the notifications queue', function () {
    Queue::fake();

    $channel = NotificationChannel::factory()->create();
    $monitor = Monitor::factory()->create();

    SendNotificationJob::dispatch($channel, $monitor, 'down');

    Queue::assertPushedOn('notifications', SendNotificationJob::class);
});

test('send notification job sends slack webhook', function () {
    Http::fake(['https://hooks.slack.com/*' => Http::response([], 200)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->slack()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor = Monitor::factory()->http()->for($user)->create(['team_id' => $user->current_team_id]);

    $job = new SendNotificationJob($channel, $monitor, 'down');
    $job->handle();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'hooks.slack.com'));
});

test('send notification job sends discord embed', function () {
    Http::fake(['https://discord.com/*' => Http::response([], 204)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->discord()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor = Monitor::factory()->http()->for($user)->create(['team_id' => $user->current_team_id]);

    $job = new SendNotificationJob($channel, $monitor, 'down');
    $job->handle();

    Http::assertSent(
        fn ($request) => str_contains($request->url(), 'discord.com')
            && isset($request->data()['embeds'])
    );
});

test('send notification job sends telegram message', function () {
    Http::fake(['https://api.telegram.org/*' => Http::response(['ok' => true], 200)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->telegram()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor = Monitor::factory()->http()->for($user)->create(['team_id' => $user->current_team_id]);

    $job = new SendNotificationJob($channel, $monitor, 'down');
    $job->handle();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'api.telegram.org'));
});

test('send notification job sends email', function () {
    Mail::fake();

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor = Monitor::factory()->http()->for($user)->create(['team_id' => $user->current_team_id]);

    $job = new SendNotificationJob($channel, $monitor, 'down');
    $job->handle();

    Mail::assertSent(MonitorStatusMail::class);
});

test('down and up notifications both fire without suppression', function () {
    Http::fake(['https://hooks.slack.com/*' => Http::response([], 200)]);

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->slack()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor = Monitor::factory()->http()->for($user)->create(['team_id' => $user->current_team_id]);

    (new SendNotificationJob($channel, $monitor, 'down'))->handle();
    (new SendNotificationJob($channel, $monitor, 'up'))->handle();

    Http::assertSentCount(2);
});

test('each channel receives its own notification', function () {
    Http::fake(['https://hooks.slack.com/*' => Http::response([], 200)]);

    $user = User::factory()->create();
    $channel1 = NotificationChannel::factory()->slack()->for($user)->create(['team_id' => $user->current_team_id]);
    $channel2 = NotificationChannel::factory()->slack()->for($user)->create(['team_id' => $user->current_team_id]);
    $monitor = Monitor::factory()->http()->for($user)->create(['team_id' => $user->current_team_id]);

    (new SendNotificationJob($channel1, $monitor, 'down'))->handle();
    (new SendNotificationJob($channel2, $monitor, 'down'))->handle();

    Http::assertSentCount(2);
});
