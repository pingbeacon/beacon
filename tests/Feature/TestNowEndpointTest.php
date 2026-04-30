<?php

use App\DTOs\CheckResult;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;
use App\Services\Checkers\HttpChecker;

beforeEach(function () {
    $this->app->instance(HttpChecker::class, new class extends HttpChecker
    {
        public function check(Monitor $monitor): CheckResult
        {
            return new CheckResult(status: 'up', responseTime: 88, statusCode: 200);
        }
    });
});

test('guests cannot reach the test-now endpoint', function () {
    $this->postJson('/monitors/test-now', [
        'type' => 'http',
        'name' => 'demo',
        'url' => 'https://example.com',
    ])->assertStatus(401);
});

test('authenticated user receives a TestNowResult JSON payload', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/monitors/test-now', [
        'type' => 'http',
        'name' => 'demo',
        'url' => 'https://example.com',
        'method' => 'GET',
        'timeout' => 10,
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'result' => ['status', 'responseTime', 'statusCode', 'message', 'startedAt', 'type'],
        ])
        ->assertJsonPath('result.status', 'up')
        ->assertJsonPath('result.statusCode', 200)
        ->assertJsonPath('result.type', 'http');
});

test('test-now endpoint validates type and url', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/monitors/test-now', [
        'name' => 'no type',
    ])->assertStatus(422)->assertJsonValidationErrors(['type']);

    $this->actingAs($user)->postJson('/monitors/test-now', [
        'type' => 'http',
        'name' => 'no url',
    ])->assertStatus(422)->assertJsonValidationErrors(['url']);
});

test('test-now endpoint does not write a heartbeat', function () {
    $user = User::factory()->create();
    $before = Heartbeat::query()->count();

    $this->actingAs($user)->postJson('/monitors/test-now', [
        'type' => 'http',
        'name' => 'demo',
        'url' => 'https://example.com',
        'method' => 'GET',
        'timeout' => 10,
    ])->assertOk();

    expect(Heartbeat::query()->count())->toBe($before);
});
