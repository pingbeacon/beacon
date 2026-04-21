<?php

namespace Database\Factories;

use App\Models\Monitor;
use App\Models\SslCertificate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SslCertificate>
 */
class SslCertificateFactory extends Factory
{
    public function definition(): array
    {
        return [
            'monitor_id' => Monitor::factory(),
            'issuer' => 'Let\'s Encrypt Authority X3',
            'subject' => fake()->domainName(),
            'valid_from' => now()->subMonths(6),
            'valid_to' => now()->addMonths(3),
            'fingerprint' => fake()->sha256(),
            'days_until_expiry' => 90,
            'is_valid' => true,
            'last_checked_at' => now(),
        ];
    }

    public function expiringSoon(int $days = 7): static
    {
        return $this->state(fn () => [
            'valid_to' => now()->addDays($days),
            'days_until_expiry' => $days,
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'valid_to' => now()->subDay(),
            'days_until_expiry' => -1,
            'is_valid' => false,
        ]);
    }
}
