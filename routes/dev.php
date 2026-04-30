<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

if (! app()->isProduction()) {
    Route::get('dev/login/{id}', function ($id = null) {
        $user = User::find($id);
        auth()->login($user);

        return redirect('/');
    });

    Route::get('dev/primitives', fn () => Inertia::render('dev/primitives'))
        ->name('dev.primitives');
}
