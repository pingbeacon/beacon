<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->withoutVite()->actingAs(User::factory()->create());

    $this->get('/dashboard')->assertOk();
});
