<?php

use App\Models\AppSetting;
use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\StatusPage;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Carbon;

test('monitor belongs to a user', function () {
    $monitor = Monitor::factory()->create();

    expect($monitor->user)->toBeInstanceOf(User::class);
});

test('user has many monitors', function () {
    $user = User::factory()->create();
    Monitor::factory()->count(3)->create(['user_id' => $user->id]);

    expect($user->monitors)->toHaveCount(3);
});

test('monitor has many heartbeats', function () {
    $monitor = Monitor::factory()->create();
    Heartbeat::factory()->count(5)->create(['monitor_id' => $monitor->id]);

    expect($monitor->heartbeats)->toHaveCount(5);
});

test('monitor has many incidents', function () {
    $monitor = Monitor::factory()->create();
    Incident::factory()->count(2)->create(['monitor_id' => $monitor->id]);

    expect($monitor->incidents)->toHaveCount(2);
});

test('monitor belongs to many tags', function () {
    $monitor = Monitor::factory()->create();
    $tags = Tag::factory()->count(2)->create(['user_id' => $monitor->user_id]);
    $monitor->tags()->attach($tags);

    expect($monitor->tags)->toHaveCount(2);
});

test('monitor belongs to many notification channels', function () {
    $monitor = Monitor::factory()->create();
    $channels = NotificationChannel::factory()->count(2)->create(['user_id' => $monitor->user_id]);
    $monitor->notificationChannels()->attach($channels);

    expect($monitor->notificationChannels)->toHaveCount(2);
});

test('monitor belongs to many status pages', function () {
    $monitor = Monitor::factory()->create();
    $statusPage = StatusPage::factory()->create(['user_id' => $monitor->user_id]);
    $monitor->statusPages()->attach($statusPage, ['sort_order' => 1]);

    expect($monitor->statusPages)->toHaveCount(1)
        ->and($monitor->statusPages->first()->pivot->sort_order)->toBe(1);
});

test('heartbeat belongs to monitor', function () {
    $heartbeat = Heartbeat::factory()->create();

    expect($heartbeat->monitor)->toBeInstanceOf(Monitor::class);
});

test('tag belongs to user and has many monitors', function () {
    $tag = Tag::factory()->create();
    $monitor = Monitor::factory()->create(['user_id' => $tag->user_id]);
    $tag->monitors()->attach($monitor);

    expect($tag->user)->toBeInstanceOf(User::class)
        ->and($tag->monitors)->toHaveCount(1);
});

test('notification channel belongs to user', function () {
    $channel = NotificationChannel::factory()->create();

    expect($channel->user)->toBeInstanceOf(User::class)
        ->and($channel->configuration)->toBeArray();
});

test('incident belongs to monitor', function () {
    $incident = Incident::factory()->create();

    expect($incident->monitor)->toBeInstanceOf(Monitor::class)
        ->and($incident->started_at)->toBeInstanceOf(Carbon::class);
});

test('status page belongs to user and has many monitors', function () {
    $statusPage = StatusPage::factory()->create();
    $monitor = Monitor::factory()->create(['user_id' => $statusPage->user_id]);
    $statusPage->monitors()->attach($monitor, ['sort_order' => 0]);

    expect($statusPage->user)->toBeInstanceOf(User::class)
        ->and($statusPage->monitors)->toHaveCount(1);
});

test('monitor calculates uptime percentage', function () {
    $monitor = Monitor::factory()->create();

    Heartbeat::factory()->count(8)->up()->create([
        'monitor_id' => $monitor->id,
        'created_at' => now()->subMinutes(5),
    ]);
    Heartbeat::factory()->count(2)->down()->create([
        'monitor_id' => $monitor->id,
        'created_at' => now()->subMinutes(5),
    ]);

    expect($monitor->uptimePercentage(24))->toBe(80.0);
});

test('monitor uptime returns 100 when no heartbeats', function () {
    $monitor = Monitor::factory()->create();

    expect($monitor->uptimePercentage(24))->toBe(100.0);
});

test('monitor calculates average response time', function () {
    $monitor = Monitor::factory()->create();

    Heartbeat::factory()->create([
        'monitor_id' => $monitor->id,
        'response_time' => 100,
        'created_at' => now()->subMinutes(5),
    ]);
    Heartbeat::factory()->create([
        'monitor_id' => $monitor->id,
        'response_time' => 200,
        'created_at' => now()->subMinutes(5),
    ]);

    expect($monitor->averageResponseTime(24))->toBe(150.0);
});

test('monitor returns null average response time when no heartbeats', function () {
    $monitor = Monitor::factory()->create();

    expect($monitor->averageResponseTime(24))->toBeNull();
});

test('monitor returns last heartbeats in descending order', function () {
    $monitor = Monitor::factory()->create();

    Heartbeat::factory()->count(5)->create([
        'monitor_id' => $monitor->id,
    ]);

    $lastHeartbeats = $monitor->lastHeartbeats(3);

    expect($lastHeartbeats)->toHaveCount(3);
});

test('app setting get and set for user', function () {
    $user = User::factory()->create();

    AppSetting::setForUser($user->id, 'theme', 'dark');

    expect(AppSetting::getForUser($user->id, 'theme'))->toBe('dark')
        ->and(AppSetting::getForUser($user->id, 'missing', 'default'))->toBe('default');
});
