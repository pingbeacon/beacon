<?php

use App\Http\Controllers\AckIncidentController;
use App\Http\Controllers\AcknowledgeIncidentController;
use Illuminate\Support\Facades\Route;

Route::get('ack/{token}', AckIncidentController::class)
    ->middleware('signed')
    ->name('incidents.ack');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('incidents/{incident}/ack', AcknowledgeIncidentController::class)
        ->name('incidents.acknowledge');
});
