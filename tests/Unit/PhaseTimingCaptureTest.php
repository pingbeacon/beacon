<?php

use App\DTOs\PhaseTiming;
use App\Services\PhaseTimingCapture;

test('fromHandlerStats maps full HTTPS curl stats to ms timings', function () {
    $stats = [
        'namelookup_time' => 0.018,
        'connect_time' => 0.042,
        'appconnect_time' => 0.128,
        'starttransfer_time' => 0.260,
        'total_time' => 0.286,
    ];

    $timing = PhaseTimingCapture::fromHandlerStats($stats);

    expect($timing)->toBeInstanceOf(PhaseTiming::class)
        ->and($timing->phaseDnsMs)->toBe(18)
        ->and($timing->phaseTcpMs)->toBe(24)
        ->and($timing->phaseTlsMs)->toBe(86)
        ->and($timing->phaseTtfbMs)->toBe(132)
        ->and($timing->phaseTransferMs)->toBe(26);
});

test('fromHandlerStats treats appconnect_time of zero as plain HTTP and skips TLS', function () {
    $stats = [
        'namelookup_time' => 0.010,
        'connect_time' => 0.030,
        'appconnect_time' => 0.0,
        'starttransfer_time' => 0.150,
        'total_time' => 0.200,
    ];

    $timing = PhaseTimingCapture::fromHandlerStats($stats);

    expect($timing->phaseDnsMs)->toBe(10)
        ->and($timing->phaseTcpMs)->toBe(20)
        ->and($timing->phaseTlsMs)->toBeNull()
        ->and($timing->phaseTtfbMs)->toBe(120)
        ->and($timing->phaseTransferMs)->toBe(50);
});

test('fromHandlerStats returns all-null timing when stats are missing', function () {
    $timing = PhaseTimingCapture::fromHandlerStats([]);

    expect($timing->phaseDnsMs)->toBeNull()
        ->and($timing->phaseTcpMs)->toBeNull()
        ->and($timing->phaseTlsMs)->toBeNull()
        ->and($timing->phaseTtfbMs)->toBeNull()
        ->and($timing->phaseTransferMs)->toBeNull();
});

test('fromHandlerStats clamps negative deltas to null', function () {
    $stats = [
        'namelookup_time' => 0.100,
        'connect_time' => 0.080, // out of order — TCP delta would be negative
        'appconnect_time' => 0.090,
        'starttransfer_time' => 0.050, // earlier than appconnect — TTFB negative
        'total_time' => 0.040, // earlier than starttransfer — transfer negative
    ];

    $timing = PhaseTimingCapture::fromHandlerStats($stats);

    expect($timing->phaseDnsMs)->toBe(100)
        ->and($timing->phaseTcpMs)->toBeNull()
        ->and($timing->phaseTlsMs)->toBe(10)
        ->and($timing->phaseTtfbMs)->toBeNull()
        ->and($timing->phaseTransferMs)->toBeNull();
});

test('fromHandlerStats rounds fractional millis', function () {
    $stats = [
        'namelookup_time' => 0.0125,
        'connect_time' => 0.0254,
        'appconnect_time' => 0.0,
        'starttransfer_time' => 0.1006,
        'total_time' => 0.1500,
    ];

    $timing = PhaseTimingCapture::fromHandlerStats($stats);

    expect($timing->phaseDnsMs)->toBe(13)
        ->and($timing->phaseTcpMs)->toBe(13)
        ->and($timing->phaseTtfbMs)->toBe(75)
        ->and($timing->phaseTransferMs)->toBe(49);
});
