<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('monitors.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
