<?php

use App\Http\Controllers\Api\PushHeartbeatController;
use App\Http\Controllers\Api\V1\HeartbeatController;
use App\Http\Controllers\Api\V1\IncidentController;
use App\Http\Controllers\Api\V1\MonitorController;
use App\Http\Controllers\Api\V1\StatusPageController;
use App\Http\Controllers\Api\V1\TagController;
use Illuminate\Support\Facades\Route;

Route::post('push/{token}', PushHeartbeatController::class)->name('push.heartbeat');

Route::middleware(['auth:sanctum', 'api.team', 'throttle:api'])->prefix('v1')->name('api.v1.')->group(function () {
    Route::apiResource('monitors', MonitorController::class);
    Route::get('monitors/{monitor}/heartbeats', [HeartbeatController::class, 'index'])->name('monitors.heartbeats.index');
    Route::get('monitors/{monitor}/heartbeats/{heartbeat}', [HeartbeatController::class, 'show'])->name('monitors.heartbeats.show');
    Route::get('monitors/{monitor}/incidents', [IncidentController::class, 'index'])->name('monitors.incidents.index');
    Route::get('monitors/{monitor}/incidents/{incident}', [IncidentController::class, 'show'])->name('monitors.incidents.show');
    Route::apiResource('status-pages', StatusPageController::class);
    Route::get('tags', [TagController::class, 'index'])->name('tags.index');
});
