<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

if (! app()->isProduction()) {
    Route::get('dev/login/{id}', function ($id = null) {
        $user = User::find($id);
        auth()->login($user);

        return redirect('/');
    });
}
