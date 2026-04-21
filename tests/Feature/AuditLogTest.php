<?php

use App\Models\AuditLog;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\Team;
use App\Models\User;
use App\Services\AuditLogger;

// --- Auditable trait ---

test('auditable trait logs a created event when model has team_id', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam; // personal team auto-created by UserFactory

    $this->actingAs($user);

    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
    ]);

    expect(AuditLog::query()
        ->where('auditable_type', Monitor::class)
        ->where('auditable_id', $monitor->id)
        ->where('action', 'created')
        ->where('team_id', $team->id)
        ->where('user_id', $user->id)
        ->exists()
    )->toBeTrue();
});

test('auditable trait logs an updated event with old and new values', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
        'name' => 'Old Name',
    ]);

    $monitor->update(['name' => 'New Name']);

    $log = AuditLog::query()
        ->where('auditable_type', Monitor::class)
        ->where('auditable_id', $monitor->id)
        ->where('action', 'updated')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->old_values)->toMatchArray(['name' => 'Old Name'])
        ->and($log->new_values)->toMatchArray(['name' => 'New Name']);
});

test('auditable trait does not log updated event when only excluded fields change', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
    ]);

    $countBefore = AuditLog::query()->where('action', 'updated')->count();

    $monitor->update(['updated_at' => now()]);

    expect(AuditLog::query()->where('action', 'updated')->count())->toBe($countBefore);
});

test('auditable trait logs a deleted event', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
    ]);

    $monitor->delete();

    expect(AuditLog::query()
        ->where('auditable_type', Monitor::class)
        ->where('auditable_id', $monitor->id)
        ->where('action', 'deleted')
        ->exists()
    )->toBeTrue();
});

test('auditable trait does not log when no authenticated user', function () {
    $team = Team::factory()->create();

    $countBefore = AuditLog::count();

    Monitor::factory()->create([
        'team_id' => $team->id,
    ]);

    expect(AuditLog::count())->toBe($countBefore);
});

test('auditable trait does not log when model team_id is null at runtime', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
    ]);

    // Set team_id to null on the in-memory instance to verify the guard condition.
    $monitor->team_id = null;

    $countBefore = AuditLog::count();

    Monitor::logAudit($monitor, 'updated', [], ['name' => 'changed']);

    expect(AuditLog::count())->toBe($countBefore);
});

test('notification channel audit excludes configuration field', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    $channel = NotificationChannel::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
        'name' => 'Slack',
        'configuration' => ['webhook_url' => 'https://hooks.slack.com/secret'],
    ]);

    $log = AuditLog::query()
        ->where('auditable_type', NotificationChannel::class)
        ->where('auditable_id', $channel->id)
        ->where('action', 'created')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->new_values)->not->toHaveKey('configuration');
});

// --- AuditLogger service ---

test('audit logger service creates an audit log for a model with team_id', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    $monitor = Monitor::factory()->create([
        'user_id' => $user->id,
        'team_id' => $team->id,
    ]);

    AuditLogger::log($monitor, 'paused', ['is_active' => true], ['is_active' => false]);

    expect(AuditLog::query()
        ->where('auditable_id', $monitor->id)
        ->where('action', 'paused')
        ->where('team_id', $team->id)
        ->exists()
    )->toBeTrue();
});

test('audit logger service falls back to user current_team_id when model has no team_id', function () {
    $user = User::factory()->create();
    $team = $user->currentTeam;

    $this->actingAs($user);

    // Use an unsaved in-memory model with team_id = null to exercise the fallback path.
    $monitor = Monitor::factory()->make([
        'user_id' => $user->id,
        'team_id' => null,
    ]);
    $monitor->id = 9999;

    AuditLogger::log($monitor, 'resumed');

    expect(AuditLog::query()
        ->where('auditable_id', 9999)
        ->where('action', 'resumed')
        ->where('team_id', $team->id)
        ->exists()
    )->toBeTrue();
});

test('audit logger service does nothing when no authenticated user', function () {
    $team = Team::factory()->create();

    $monitor = Monitor::factory()->create(['team_id' => $team->id]);

    $countBefore = AuditLog::count();

    AuditLogger::log($monitor, 'paused');

    expect(AuditLog::count())->toBe($countBefore);
});

// --- AuditLog model ---

test('audit log belongs to a user', function () {
    $user = User::factory()->create();

    $log = AuditLog::factory()->create([
        'team_id' => $user->currentTeam->id,
        'user_id' => $user->id,
    ]);

    expect($log->user->id)->toBe($user->id);
});

test('audit log belongs to a team', function () {
    $team = Team::factory()->create();

    $log = AuditLog::factory()->create(['team_id' => $team->id]);

    expect($log->team->id)->toBe($team->id);
});

test('audit log has no updated_at column', function () {
    $team = Team::factory()->create();

    $log = AuditLog::factory()->create(['team_id' => $team->id]);

    expect($log->updated_at)->toBeNull();
});
