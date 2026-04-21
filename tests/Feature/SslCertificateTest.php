<?php

use App\DTOs\SslCheckResult;
use App\Events\SslCertificateChecked;
use App\Jobs\CheckSslCertificateJob;
use App\Jobs\SendNotificationJob;
use App\Models\Monitor;
use App\Models\NotificationChannel;
use App\Models\SslCertificate;
use App\Models\User;
use App\Services\SslCertificateChecker;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

// --- SslCertificate model ---

test('ssl certificate isExpiringSoon returns true when within threshold', function () {
    $cert = SslCertificate::factory()->make(['days_until_expiry' => 5, 'is_valid' => true]);

    expect($cert->isExpiringSoon(7))->toBeTrue();
    expect($cert->isExpiringSoon(3))->toBeFalse();
});

test('ssl certificate isExpiringSoon returns false when invalid', function () {
    $cert = SslCertificate::factory()->expired()->make();

    expect($cert->isExpiringSoon(30))->toBeFalse();
});

// --- CheckSslCertificateJob ---

test('job creates ssl certificate record', function () {
    Event::fake();

    $monitor = Monitor::factory()->http()->create([
        'ssl_monitoring_enabled' => true,
        'url' => 'https://example.com',
    ]);

    $mockResult = new SslCheckResult(
        issuer: 'Let\'s Encrypt',
        subject: 'example.com',
        validFrom: CarbonImmutable::now()->subMonths(6),
        validTo: CarbonImmutable::now()->addMonths(3),
        fingerprint: 'abc123',
        daysUntilExpiry: 90,
        isValid: true,
    );

    $checker = Mockery::mock(SslCertificateChecker::class);
    $checker->shouldReceive('check')->with($monitor->url)->once()->andReturn($mockResult);
    app()->instance(SslCertificateChecker::class, $checker);

    (new CheckSslCertificateJob($monitor))->handle($checker);

    $cert = $monitor->sslCertificate;
    expect($cert)->not->toBeNull();
    expect($cert->issuer)->toBe('Let\'s Encrypt');
    expect($cert->is_valid)->toBeTrue();
    expect($cert->days_until_expiry)->toBe(90);

    Event::assertDispatched(SslCertificateChecked::class);
});

test('job updates existing ssl certificate', function () {
    Event::fake();

    $monitor = Monitor::factory()->http()->create([
        'ssl_monitoring_enabled' => true,
        'url' => 'https://example.com',
    ]);

    SslCertificate::factory()->create([
        'monitor_id' => $monitor->id,
        'days_until_expiry' => 100,
    ]);

    $mockResult = new SslCheckResult(
        issuer: 'Let\'s Encrypt',
        subject: 'example.com',
        validFrom: CarbonImmutable::now()->subMonths(6),
        validTo: CarbonImmutable::now()->addMonths(2),
        fingerprint: 'abc123',
        daysUntilExpiry: 60,
        isValid: true,
    );

    $checker = Mockery::mock(SslCertificateChecker::class);
    $checker->shouldReceive('check')->once()->andReturn($mockResult);

    (new CheckSslCertificateJob($monitor))->handle($checker);

    expect(SslCertificate::where('monitor_id', $monitor->id)->count())->toBe(1);
    expect($monitor->sslCertificate->fresh()->days_until_expiry)->toBe(60);
});

test('job dispatches notification when threshold crossed', function () {
    Event::fake();
    Queue::fake();

    $user = User::factory()->create();
    $channel = NotificationChannel::factory()->for($user)->create();
    $monitor = Monitor::factory()->http()->for($user)->create([
        'ssl_monitoring_enabled' => true,
        'url' => 'https://example.com',
        'ssl_expiry_notification_days' => [30, 14, 7],
    ]);
    $monitor->notificationChannels()->sync([$channel->id]);

    $mockResult = new SslCheckResult(
        issuer: 'Let\'s Encrypt',
        subject: 'example.com',
        validFrom: CarbonImmutable::now()->subMonths(11),
        validTo: CarbonImmutable::now()->addDays(10),
        fingerprint: 'abc123',
        daysUntilExpiry: 10,
        isValid: true,
    );

    $checker = Mockery::mock(SslCertificateChecker::class);
    $checker->shouldReceive('check')->once()->andReturn($mockResult);

    (new CheckSslCertificateJob($monitor))->handle($checker);

    Queue::assertPushed(SendNotificationJob::class);
});

// --- Command scope ---

test('check-ssl command only dispatches for enabled http monitors', function () {
    Queue::fake();

    Monitor::factory()->http()->create(['ssl_monitoring_enabled' => true, 'is_active' => true]);
    Monitor::factory()->http()->create(['ssl_monitoring_enabled' => false, 'is_active' => true]);
    Monitor::factory()->tcp()->create(['ssl_monitoring_enabled' => true, 'is_active' => true]);
    Monitor::factory()->http()->create(['ssl_monitoring_enabled' => true, 'is_active' => false]);

    $this->artisan('monitors:check-ssl')->assertSuccessful();

    Queue::assertPushed(CheckSslCertificateJob::class, 1);
});

// --- Show page includes SSL data ---

test('show page includes ssl certificate as deferred prop', function () {
    $user = User::factory()->create();
    $monitor = Monitor::factory()->http()->for($user)->create(['ssl_monitoring_enabled' => true]);
    SslCertificate::factory()->create(['monitor_id' => $monitor->id]);

    $this->actingAs($user)
        ->get("/monitors/{$monitor->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('monitors/show'));
});

// --- Form request validation ---

test('ssl fields are accepted when creating a monitor', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'SSL Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
            'ssl_monitoring_enabled' => true,
            'ssl_expiry_notification_days' => [30, 14, 7],
        ])
        ->assertSessionHasNoErrors();

    $monitor = Monitor::where('name', 'SSL Monitor')->first();
    expect($monitor->ssl_monitoring_enabled)->toBeTrue();
    expect($monitor->ssl_expiry_notification_days)->toBe([30, 14, 7]);
});
