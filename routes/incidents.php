<?php

use App\Http\Controllers\AckIncidentController;
use App\Http\Controllers\AcknowledgeIncidentController;
use App\Http\Controllers\ConfirmAckController;
use Illuminate\Support\Facades\Route;

Route::get('ack/{token}', AckIncidentController::class)
    ->middleware('signed')
    ->name('incidents.ack');

Route::post('ack/{token}', ConfirmAckController::class)
    ->middleware('signed')
    ->name('incidents.ack.confirm');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('incidents/{incident}/ack', AcknowledgeIncidentController::class)
        ->middleware('can:acknowledge,incident')
        ->name('incidents.acknowledge');
});
