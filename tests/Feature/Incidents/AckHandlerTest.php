<?php

use App\Enums\AckStatus;
use App\Models\Incident;
use App\Models\User;
use App\Services\AckHandler;
use Illuminate\Support\Carbon;

test('ack with valid token marks the incident acked and returns Acked status', function () {
    $incident = Incident::factory()->create();

    $result = (new AckHandler)->ack($incident->ack_token);

    expect($result->status)->toBe(AckStatus::Acked);
    expect($result->incident)->not->toBeNull();
    expect($result->incident->id)->toBe($incident->id);
    expect($incident->fresh()->acked_at)->not->toBeNull();
    expect($incident->fresh()->acked_by)->toBeNull();
});

test('ack records acked_by when user id is provided', function () {
    $user = User::factory()->create();
    $incident = Incident::factory()->create();

    $result = (new AckHandler)->ack($incident->ack_token, $user->id);

    expect($result->status)->toBe(AckStatus::Acked);
    expect($incident->fresh()->acked_by)->toBe($user->id);
});

test('replaying a token returns AlreadyAcked and does not change acked_at', function () {
    $incident = Incident::factory()->create();
    $handler = new AckHandler;

    $first = $handler->ack($incident->ack_token);
    $originalAckedAt = $incident->fresh()->acked_at;

    expect($first->status)->toBe(AckStatus::Acked);

    Carbon::setTestNow(now()->addSeconds(2));
    $second = $handler->ack($incident->ack_token);

    expect($second->status)->toBe(AckStatus::AlreadyAcked);
    expect($second->incident)->not->toBeNull();
    expect($incident->fresh()->acked_at->equalTo($originalAckedAt))->toBeTrue();
});

test('ack on a resolved incident returns Resolved and does not mutate', function () {
    $incident = Incident::factory()->resolved()->create();

    $result = (new AckHandler)->ack($incident->ack_token);

    expect($result->status)->toBe(AckStatus::Resolved);
    expect($incident->fresh()->acked_at)->toBeNull();
});

test('ack with unknown token returns InvalidToken', function () {
    Incident::factory()->create();

    $result = (new AckHandler)->ack('totally-unknown-token-value');

    expect($result->status)->toBe(AckStatus::InvalidToken);
    expect($result->incident)->toBeNull();
});

test('ack with empty token returns InvalidToken without scanning', function () {
    $result = (new AckHandler)->ack('');

    expect($result->status)->toBe(AckStatus::InvalidToken);
});

test('every new incident gets a unique ack token automatically', function () {
    $a = Incident::factory()->create();
    $b = Incident::factory()->create();

    expect($a->ack_token)->not->toBeNull();
    expect($b->ack_token)->not->toBeNull();
    expect($a->ack_token)->not->toBe($b->ack_token);
    expect(strlen($a->ack_token))->toBeGreaterThanOrEqual(32);
});

test('ack respects an explicit ack_token override on the model', function () {
    $incident = Incident::factory()->create(['ack_token' => 'pre-set-token-value']);

    $result = (new AckHandler)->ack('pre-set-token-value');

    expect($result->status)->toBe(AckStatus::Acked);
});
