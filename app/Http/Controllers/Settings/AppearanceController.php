<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;

class AppearanceController extends Controller
{
    public function __invoke()
    {
        return inertia('settings/appearance');
    }
}
