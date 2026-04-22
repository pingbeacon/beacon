<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\Settings;
use App\Http\Controllers\SwitchTeamController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamMemberController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [Settings\ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [Settings\ProfileController::class, 'update'])->name('profile.update');

    Route::get('settings/password', [Settings\PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [Settings\PasswordController::class, 'update'])->name('password.update');
    Route::get('settings/delete-account', [Settings\DeleteAccountController::class, 'index'])->name('settings.index');
    Route::delete('settings/delete-account', [Settings\DeleteAccountController::class, 'destroy'])->name('settings.delete-account');

    Route::resource('settings/teams', TeamController::class)->names('teams')->except(['show']);
    Route::post('settings/teams/{team}/members', [TeamMemberController::class, 'store'])->name('teams.members.store');
    Route::patch('settings/teams/{team}/members/{user}', [TeamMemberController::class, 'update'])->name('teams.members.update');
    Route::delete('settings/teams/{team}/members/{user}', [TeamMemberController::class, 'destroy'])->name('teams.members.destroy');
    Route::post('switch-team/{team}', SwitchTeamController::class)->name('teams.switch');
    Route::get('settings/audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');
});
