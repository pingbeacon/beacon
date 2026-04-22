<?php

use App\Models\User;

test('reverb config is injected into page html', function () {
    config([
        'broadcasting.connections.reverb.key' => 'test-key-123',
        'broadcasting.connections.reverb.options.host' => 'reverb.example.com',
        'broadcasting.connections.reverb.options.port' => 8080,
        'broadcasting.connections.reverb.options.scheme' => 'http',
    ]);

    $this->withoutVite()->actingAs(User::factory()->create());

    $response = $this->get('/dashboard');

    $response->assertOk();
    $response->assertSee('window.__reverb__', false);
    $response->assertSee('test-key-123', false);
    $response->assertSee('reverb.example.com', false);
});
