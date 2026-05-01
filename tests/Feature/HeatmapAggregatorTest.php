<?php

use App\Models\Incident;
use App\Models\Monitor;
use App\Services\HeatmapAggregator;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->aggregator = new HeatmapAggregator;
});

it('returns zero counts for every day in window when no incidents', function () {
    $monitor = Monitor::factory()->create();
    $to = CarbonImmutable::parse('2026-04-30');
    $from = $to->subDays(2);

    $days = $this->aggregator->dailyIncidentCounts($monitor, $from, $to);

    expect($days)->toHaveCount(3);
    expect($days[0])->toBe(['date' => '2026-04-28', 'count' => 0]);
    expect($days[1])->toBe(['date' => '2026-04-29', 'count' => 0]);
    expect($days[2])->toBe(['date' => '2026-04-30', 'count' => 0]);
});

it('counts incidents into their started_at day', function () {
    $monitor = Monitor::factory()->create();
    $to = CarbonImmutable::parse('2026-04-30 23:59:59');
    $from = $to->subDays(4)->startOfDay();

    Incident::factory()->for($monitor)->count(2)->create(['started_at' => '2026-04-28 03:00:00']);
    Incident::factory()->for($monitor)->create(['started_at' => '2026-04-30 12:00:00']);

    $days = $this->aggregator->dailyIncidentCounts($monitor, $from, $to);

    $byDate = collect($days)->keyBy('date');
    expect($byDate['2026-04-28']['count'])->toBe(2);
    expect($byDate['2026-04-29']['count'])->toBe(0);
    expect($byDate['2026-04-30']['count'])->toBe(1);
});

it('ignores incidents from other monitors', function () {
    $monitor = Monitor::factory()->create();
    $other = Monitor::factory()->create();
    $to = CarbonImmutable::parse('2026-04-30 23:59:59');
    $from = $to->startOfDay();

    Incident::factory()->for($monitor)->create(['started_at' => '2026-04-30 10:00:00']);
    Incident::factory()->for($other)->count(5)->create(['started_at' => '2026-04-30 10:00:00']);

    $days = $this->aggregator->dailyIncidentCounts($monitor, $from, $to);

    expect($days)->toHaveCount(1);
    expect($days[0]['count'])->toBe(1);
});

it('includes from and to boundary days', function () {
    $monitor = Monitor::factory()->create();
    $to = CarbonImmutable::parse('2026-04-30 23:59:59');
    $from = CarbonImmutable::parse('2026-04-28 00:00:00');

    Incident::factory()->for($monitor)->create(['started_at' => '2026-04-28 00:00:01']);
    Incident::factory()->for($monitor)->create(['started_at' => '2026-04-30 23:59:00']);

    $days = $this->aggregator->dailyIncidentCounts($monitor, $from, $to);

    $byDate = collect($days)->keyBy('date');
    expect($byDate['2026-04-28']['count'])->toBe(1);
    expect($byDate['2026-04-30']['count'])->toBe(1);
});

it('returns days in chronological order', function () {
    $monitor = Monitor::factory()->create();
    $to = CarbonImmutable::parse('2026-04-30');
    $from = $to->subDays(89);

    $days = $this->aggregator->dailyIncidentCounts($monitor, $from, $to);

    expect($days)->toHaveCount(90);
    expect($days[0]['date'])->toBe($from->toDateString());
    expect($days[89]['date'])->toBe('2026-04-30');
});
