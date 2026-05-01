<?php

use App\Models\Assertion;
use App\Models\AssertionResult;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Models\User;

beforeEach(function (): void {
    if (! file_exists(base_path('node_modules/playwright'))) {
        test()->markTestSkipped('playwright is not installed');
    }
});

test('assertions tab renders summary, toolbar, and rows for a seeded monitor', function (): void {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->up()->create([
        'user_id' => $user->id,
        'team_id' => $user->current_team_id,
        'name' => 'assertions-tab-monitor',
    ]);

    $statusRule = Assertion::factory()->for($monitor)->status(200)->create();
    $latencyRule = Assertion::factory()->for($monitor)->latency(2000)->create();

    $heartbeats = collect();
    foreach (range(0, 19) as $i) {
        $heartbeats->push(Heartbeat::factory()->for($monitor)->create([
            'status' => 'up',
            'status_code' => 200,
            'response_time' => 200 + $i * 30,
            'created_at' => now()->subMinutes($i * 30),
        ]));
    }

    foreach ($heartbeats as $hb) {
        AssertionResult::factory()->state([
            'assertion_id' => $statusRule->id,
            'heartbeat_id' => $hb->id,
            'passed' => true,
            'actual_value' => '200',
            'observed_at' => $hb->created_at,
        ])->create();

        AssertionResult::factory()->state([
            'assertion_id' => $latencyRule->id,
            'heartbeat_id' => $hb->id,
            'passed' => $hb->response_time < 2000,
            'actual_value' => (string) $hb->response_time,
            'observed_at' => $hb->created_at,
        ])->create();
    }

    $this->actingAs($user);

    $page = visit("/monitors/{$monitor->id}?tab=assertions");

    $page->assertPresent('[data-slot="assertions-summary"]')
        ->assertPresent('[data-slot="assertions-toolbar"]')
        ->assertPresent('[data-slot="assertion-row"]');
});
