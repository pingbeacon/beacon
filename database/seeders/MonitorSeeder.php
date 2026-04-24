<?php

namespace Database\Seeders;

use App\Models\Heartbeat;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MonitorSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'test@example.com')->firstOrFail();

        $monitors = $this->definitions($user->id, $user->current_team_id);

        foreach ($monitors as $definition) {
            $heartbeats = $definition['heartbeats'] ?? [];
            $incidents = $definition['incidents'] ?? [];
            unset($definition['heartbeats'], $definition['incidents']);

            $monitor = Monitor::create($definition);

            foreach ($heartbeats as $hb) {
                (new Heartbeat)->forceFill(['monitor_id' => $monitor->id, ...$hb])->save();
            }

            foreach ($incidents as $inc) {
                Incident::create(['monitor_id' => $monitor->id, ...$inc]);
            }

            if ($monitor->status === 'up' || $monitor->status === 'down') {
                $latest = $monitor->heartbeats()->latest()->first();
                if ($latest) {
                    $monitor->update(['last_checked_at' => $latest->created_at]);
                }
            }
        }
    }

    /**
     * Generate evenly-spaced heartbeats over a window, with optional down bursts.
     *
     * @param  array<array{from: Carbon, to: Carbon}>  $downBursts
     * @return array<int, array{status: string, status_code: int|null, response_time: int|null, message: string|null, created_at: Carbon}>
     */
    private function heartbeatHistory(
        int $hours,
        int $intervalSeconds,
        string $type = 'http',
        array $downBursts = [],
    ): array {
        $records = [];
        $now = now();
        $start = $now->copy()->subHours($hours);
        $current = $start->copy();

        while ($current->lessThanOrEqualTo($now)) {
            $isDown = false;
            foreach ($downBursts as $burst) {
                if ($current->between($burst['from'], $burst['to'])) {
                    $isDown = true;
                    break;
                }
            }

            if ($isDown) {
                $records[] = [
                    'status' => 'down',
                    'status_code' => $type === 'http' ? 503 : null,
                    'response_time' => null,
                    'message' => 'Connection refused',
                    'created_at' => $current->copy(),
                ];
            } else {
                $records[] = [
                    'status' => 'up',
                    'status_code' => $type === 'http' ? 200 : null,
                    'response_time' => $type === 'http' ? rand(80, 600) : (in_array($type, ['tcp', 'ping']) ? rand(1, 80) : null),
                    'message' => null,
                    'created_at' => $current->copy(),
                ];
            }

            $current->addSeconds($intervalSeconds);
        }

        return $records;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function definitions(int $userId, int $teamId): array
    {
        $base = ['user_id' => $userId, 'team_id' => $teamId, 'is_active' => true, 'retry_count' => 1, 'timeout' => 10];

        return [
            // ── HTTP: UP ──────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'GitHub API',
                'type' => 'http',
                'url' => 'https://api.github.com',
                'method' => 'GET',
                'interval' => 60,
                'accepted_status_codes' => [200],
                'status' => 'up',
                'ssl_monitoring_enabled' => true,
                'heartbeats' => $this->heartbeatHistory(24, 60),
            ],
            [
                ...$base,
                'name' => 'Stripe Dashboard',
                'type' => 'http',
                'url' => 'https://dashboard.stripe.com',
                'method' => 'GET',
                'interval' => 60,
                'accepted_status_codes' => [200, 301, 302],
                'status' => 'up',
                'ssl_monitoring_enabled' => true,
                'heartbeats' => $this->heartbeatHistory(24, 60),
            ],
            [
                ...$base,
                'name' => 'Cloudflare DNS',
                'type' => 'http',
                'url' => 'https://1.1.1.1',
                'method' => 'GET',
                'interval' => 30,
                'accepted_status_codes' => [200, 301, 302, 403],
                'status' => 'up',
                'ssl_monitoring_enabled' => true,
                'heartbeats' => $this->heartbeatHistory(24, 30),
            ],
            [
                ...$base,
                'name' => 'Main Website',
                'type' => 'http',
                'url' => 'https://example.com',
                'method' => 'GET',
                'interval' => 60,
                'accepted_status_codes' => [200],
                'status' => 'up',
                'ssl_monitoring_enabled' => true,
                'heartbeats' => $this->heartbeatHistory(24, 60, 'http', [
                    ['from' => now()->subHours(18), 'to' => now()->subHours(17)],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subHours(18),
                        'resolved_at' => now()->subHours(17),
                        'cause' => 'HTTP 503 Service Unavailable',
                    ],
                ],
            ],
            [
                ...$base,
                'name' => 'Vercel Edge Network',
                'type' => 'http',
                'url' => 'https://vercel.com',
                'method' => 'HEAD',
                'interval' => 120,
                'accepted_status_codes' => [200, 301],
                'status' => 'up',
                'ssl_monitoring_enabled' => true,
                'heartbeats' => $this->heartbeatHistory(24, 120),
            ],

            // ── HTTP: DOWN ────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Internal Admin Panel',
                'type' => 'http',
                'url' => 'https://admin.internal.dev',
                'method' => 'GET',
                'interval' => 60,
                'accepted_status_codes' => [200],
                'status' => 'down',
                'ssl_monitoring_enabled' => false,
                'heartbeats' => $this->heartbeatHistory(24, 60, 'http', [
                    ['from' => now()->subHours(3), 'to' => now()],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subHours(3),
                        'resolved_at' => null,
                        'cause' => 'Connection refused',
                    ],
                ],
            ],
            [
                ...$base,
                'name' => 'Legacy Auth Service',
                'type' => 'http',
                'url' => 'https://auth.legacy.example.com/health',
                'method' => 'GET',
                'interval' => 30,
                'accepted_status_codes' => [200],
                'status' => 'down',
                'ssl_monitoring_enabled' => true,
                'heartbeats' => $this->heartbeatHistory(24, 30, 'http', [
                    ['from' => now()->subHours(6), 'to' => now()],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subHours(14),
                        'resolved_at' => now()->subHours(12),
                        'cause' => 'HTTP 502 Bad Gateway',
                    ],
                    [
                        'started_at' => now()->subHours(6),
                        'resolved_at' => null,
                        'cause' => 'HTTP 502 Bad Gateway',
                    ],
                ],
            ],

            // ── HTTP: PAUSED ──────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Staging Environment',
                'type' => 'http',
                'url' => 'https://staging.example.com',
                'method' => 'GET',
                'interval' => 300,
                'accepted_status_codes' => [200],
                'status' => 'paused',
                'is_active' => false,
                'ssl_monitoring_enabled' => false,
                'heartbeats' => $this->heartbeatHistory(48, 300),
            ],

            // ── TCP: UP ───────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Production PostgreSQL',
                'type' => 'tcp',
                'host' => 'db.prod.example.com',
                'port' => 5432,
                'interval' => 60,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 60, 'tcp'),
            ],
            [
                ...$base,
                'name' => 'Redis Cache',
                'type' => 'tcp',
                'host' => 'cache.prod.example.com',
                'port' => 6379,
                'interval' => 30,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 30, 'tcp'),
            ],
            [
                ...$base,
                'name' => 'MySQL Replica',
                'type' => 'tcp',
                'host' => 'db-replica.prod.example.com',
                'port' => 3306,
                'interval' => 60,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 60, 'tcp', [
                    ['from' => now()->subHours(10), 'to' => now()->subMinutes(570)],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subHours(10),
                        'resolved_at' => now()->subMinutes(570),
                        'cause' => 'TCP connection timeout',
                    ],
                ],
            ],

            // ── TCP: DOWN ─────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Message Broker (AMQP)',
                'type' => 'tcp',
                'host' => 'mq.prod.example.com',
                'port' => 5672,
                'interval' => 60,
                'status' => 'down',
                'heartbeats' => $this->heartbeatHistory(24, 60, 'tcp', [
                    ['from' => now()->subHours(2), 'to' => now()],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subHours(2),
                        'resolved_at' => null,
                        'cause' => 'TCP connection refused',
                    ],
                ],
            ],

            // ── TCP: PAUSED ───────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Dev Database',
                'type' => 'tcp',
                'host' => 'db.dev.example.com',
                'port' => 5432,
                'interval' => 300,
                'status' => 'paused',
                'is_active' => false,
                'heartbeats' => [],
            ],

            // ── PING: UP ──────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Google DNS',
                'type' => 'ping',
                'host' => '8.8.8.8',
                'interval' => 60,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 60, 'ping'),
            ],
            [
                ...$base,
                'name' => 'Prod Server (EU-West)',
                'type' => 'ping',
                'host' => '185.220.101.50',
                'interval' => 60,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 60, 'ping'),
            ],

            // ── PING: DOWN ────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Prod Server (AP-East)',
                'type' => 'ping',
                'host' => '203.0.113.42',
                'interval' => 60,
                'status' => 'down',
                'heartbeats' => $this->heartbeatHistory(24, 60, 'ping', [
                    ['from' => now()->subMinutes(90), 'to' => now()],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subMinutes(90),
                        'resolved_at' => null,
                        'cause' => 'Host unreachable',
                    ],
                ],
            ],

            // ── DNS: UP ───────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'example.com A Record',
                'type' => 'dns',
                'host' => 'example.com',
                'dns_record_type' => 'A',
                'interval' => 300,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 300, 'dns'),
            ],
            [
                ...$base,
                'name' => 'mail.example.com MX',
                'type' => 'dns',
                'host' => 'example.com',
                'dns_record_type' => 'MX',
                'interval' => 300,
                'status' => 'up',
                'heartbeats' => $this->heartbeatHistory(24, 300, 'dns'),
            ],

            // ── DNS: DOWN ─────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'CDN CNAME Record',
                'type' => 'dns',
                'host' => 'cdn.broken.example.com',
                'dns_record_type' => 'CNAME',
                'interval' => 300,
                'status' => 'down',
                'heartbeats' => $this->heartbeatHistory(24, 300, 'dns', [
                    ['from' => now()->subHours(5), 'to' => now()],
                ]),
                'incidents' => [
                    [
                        'started_at' => now()->subHours(5),
                        'resolved_at' => null,
                        'cause' => 'DNS resolution failed: NXDOMAIN',
                    ],
                ],
            ],

            // ── PUSH ──────────────────────────────────────────────────────────
            [
                ...$base,
                'name' => 'Nightly Backup Job',
                'type' => 'push',
                'push_token' => Str::uuid()->toString(),
                'interval' => 86400,
                'status' => 'up',
                'heartbeats' => array_map(
                    fn ($i) => [
                        'status' => 'up',
                        'status_code' => null,
                        'response_time' => null,
                        'message' => 'Backup completed successfully',
                        'created_at' => ($ts = now()->subDays($i)->setTime(3, 0))->isFuture() ? now() : $ts,
                    ],
                    range(0, 6)
                ),
            ],
            [
                ...$base,
                'name' => 'Weekly Report Cron',
                'type' => 'push',
                'push_token' => Str::uuid()->toString(),
                'interval' => 604800,
                'status' => 'down',
                'heartbeats' => [
                    [
                        'status' => 'up',
                        'status_code' => null,
                        'response_time' => null,
                        'message' => 'Report sent',
                        'created_at' => now()->subDays(14),
                    ],
                ],
                'incidents' => [
                    [
                        'started_at' => now()->subDays(7),
                        'resolved_at' => null,
                        'cause' => 'No heartbeat received within the expected window',
                    ],
                ],
            ],
        ];
    }
}
