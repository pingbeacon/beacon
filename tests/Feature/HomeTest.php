<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get('/')->assertRedirect('/login');
});

test('authenticated users are redirected to the dashboard', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/')->assertRedirect('/dashboard');
});
