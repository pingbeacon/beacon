<?php

use App\Http\Controllers\Api\PushHeartbeatController;
use Illuminate\Support\Facades\Route;

Route::post('push/{token}', PushHeartbeatController::class)->name('push.heartbeat');
