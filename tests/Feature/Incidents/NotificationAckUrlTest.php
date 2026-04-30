<?php

use App\Jobs\SendNotificationJob;
use App\Mail\MonitorStatusMail;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

test('email notification carries a signed ack URL when incident id is provided', function () {
    Mail::fake();

    $monitor = Monitor::factory()->http()->create();
    $channel = NotificationChannel::factory()->for($monitor->user)->create();
    $monitor->notificationChannels()->attach($channel);
    $incident = Incident::factory()->create(['monitor_id' => $monitor->id]);

    (new SendNotificationJob($channel, $monitor, 'down', null, $incident->id))->handle();

    Mail::assertSent(MonitorStatusMail::class, function (MonitorStatusMail $mail) use ($incident) {
        if ($mail->ackUrl === null) {
            return false;
        }
        $request = Request::create($mail->ackUrl);

        return URL::hasValidSignature($request)
            && str_contains($mail->ackUrl, $incident->ack_token);
    });
});

test('slack notification text contains the signed ack URL', function () {
    Http::fake(['https://hooks.slack.com/*' => Http::response([], 200)]);

    $monitor = Monitor::factory()->http()->create();
    $channel = NotificationChannel::factory()->slack()->for($monitor->user)->create();
    $incident = Incident::factory()->create(['monitor_id' => $monitor->id]);

    (new SendNotificationJob($channel, $monitor, 'down', null, $incident->id))->handle();

    Http::assertSent(function ($request) use ($incident) {
        return str_contains($request->url(), 'hooks.slack.com')
            && str_contains($request->data()['text'] ?? '', $incident->ack_token);
    });
});

test('webhook notification payload includes the ack url', function () {
    Http::fake(['https://example.test/*' => Http::response([], 200)]);

    $monitor = Monitor::factory()->http()->create();
    $channel = NotificationChannel::factory()->for($monitor->user)->create([
        'type' => 'webhook',
        'configuration' => ['url' => 'https://example.test/hook'],
    ]);
    $incident = Incident::factory()->create(['monitor_id' => $monitor->id]);

    (new SendNotificationJob($channel, $monitor, 'down', null, $incident->id))->handle();

    Http::assertSent(function ($request) use ($incident) {
        $data = $request->data();

        return ($data['ack_url'] ?? null) !== null
            && str_contains($data['ack_url'], $incident->ack_token);
    });
});

test('email notification has no ack URL when incident id is null', function () {
    Mail::fake();

    $monitor = Monitor::factory()->http()->create();
    $channel = NotificationChannel::factory()->for($monitor->user)->create();

    (new SendNotificationJob($channel, $monitor, 'up'))->handle();

    Mail::assertSent(MonitorStatusMail::class, fn (MonitorStatusMail $mail) => $mail->ackUrl === null);
});

test('signed ack URL embedded in slack notification renders the preview without mutating', function () {
    $monitor = Monitor::factory()->http()->create();
    $channel = NotificationChannel::factory()->slack()->for($monitor->user)->create();
    $incident = Incident::factory()->create(['monitor_id' => $monitor->id]);
    Http::fake(['https://hooks.slack.com/*' => Http::response([], 200)]);

    (new SendNotificationJob($channel, $monitor, 'down', null, $incident->id))->handle();

    $sentUrl = null;
    Http::assertSent(function ($request) use (&$sentUrl) {
        $text = $request->data()['text'] ?? '';
        if (preg_match('#https?://\S+/ack/[^\s|>]+#', $text, $m)) {
            $sentUrl = $m[0];

            return true;
        }

        return false;
    });

    $this->get($sentUrl)->assertOk();
    expect($incident->fresh()->acked_at)->toBeNull();
});
