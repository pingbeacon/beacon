<?php

namespace Database\Seeders;

use App\Console\Commands\DevFakeServersCommand;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MonitorSeeder extends Seeder
{
    public function run(): void
    {
        // Seeder builds tens of thousands of synthetic heartbeats; default CLI 128M OOMs.
        ini_set('memory_limit', '512M');

        $user = User::where('email', 'test@example.com')->firstOrFail();

        $monitors = $this->definitions($user->id, $user->current_team_id);

        foreach ($monitors as $definition) {
            $heartbeats = $definition['heartbeats'] ?? [];
            $incidents = $definition['incidents'] ?? [];
            unset($definition['heartbeats'], $definition['incidents']);

            $monitor = Monitor::create($definition);

            if (! empty($heartbeats)) {
                $isHttp = ($definition['type'] ?? null) === 'http';
                $isHttps = $isHttp && str_starts_with((string) ($definition['url'] ?? ''), 'https://');

                $rows = array_map(function (array $hb) use ($monitor, $isHttp, $isHttps) {
                    $phases = $isHttp && ($hb['response_time'] ?? null) !== null
                        ? self::syntheticPhases((int) $hb['response_time'], $isHttps)
                        : ['phase_dns_ms' => null, 'phase_tcp_ms' => null, 'phase_tls_ms' => null, 'phase_ttfb_ms' => null, 'phase_transfer_ms' => null];

                    return [
                        'monitor_id' => $monitor->id,
                        'status' => $hb['status'],
                        'status_code' => $hb['status_code'] ?? null,
                        'response_time' => $hb['response_time'] ?? null,
                        'phase_dns_ms' => $phases['phase_dns_ms'],
                        'phase_tcp_ms' => $phases['phase_tcp_ms'],
                        'phase_tls_ms' => $phases['phase_tls_ms'],
                        'phase_ttfb_ms' => $phases['phase_ttfb_ms'],
                        'phase_transfer_ms' => $phases['phase_transfer_ms'],
                        'message' => $hb['message'] ?? null,
                        'created_at' => $hb['created_at'] instanceof Carbon
                            ? $hb['created_at']->toDateTimeString()
                            : $hb['created_at'],
                    ];
                }, $heartbeats);

                foreach (array_chunk($rows, 500) as $chunk) {
                    DB::table('heartbeats')->insert($chunk);
                }
            }

            foreach ($incidents as $inc) {
                Incident::create(['monitor_id' => $monitor->id, ...$inc]);
            }

            if ($monitor->status === 'up' || $monitor->status === 'down') {
                $latestCreatedAt = DB::table('heartbeats')
                    ->where('monitor_id', $monitor->id)
                    ->max('created_at');
                if ($latestCreatedAt) {
                    $monitor->update(['last_checked_at' => $latestCreatedAt]);
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
     * Generate heartbeats for a local fake-server profile. Pure helper — driven entirely
     * by $profile so the runtime fleet and seeded history cannot drift.
     *
     * @param  array<string, mixed>  $profile
     * @return array<int, array{status: string, status_code: int|null, response_time: int|null, message: string|null, created_at: Carbon}>
     */
    public static function localServerHistory(int $hours, int $intervalSeconds, array $profile): array
    {
        $records = [];
        $now = now();
        $current = $now->copy()->subHours($hours);
        $kind = $profile['kind'] ?? 'fast';
        $monitorTimeoutMs = 10_000;

        while ($current->lessThanOrEqualTo($now)) {
            $records[] = match ($kind) {
                'fast', 'slow', 'jitter' => self::upRecord(
                    rand((int) ($profile['latency_min'] ?? 5), (int) ($profile['latency_max'] ?? 50)),
                    $current
                ),
                'spike' => self::upRecord(
                    mt_rand(1, 100) <= (int) ($profile['spike_outlier_pct'] ?? 10)
                        ? (int) ($profile['spike_outlier_ms'] ?? 3000)
                        : rand((int) ($profile['latency_min'] ?? 5), (int) ($profile['latency_max'] ?? 50)),
                    $current
                ),
                'flap' => mt_rand(1, 100) <= (int) ($profile['flap_down_pct'] ?? 20)
                    ? self::downRecord(500, 'HTTP 500 Internal Server Error', $current)
                    : self::upRecord(
                        rand((int) ($profile['latency_min'] ?? 30), (int) ($profile['latency_max'] ?? 250)),
                        $current
                    ),
                'down_500' => self::downRecord(500, 'HTTP 500 Internal Server Error', $current),
                'unbound' => self::downRecord(null, 'Connection refused', $current),
                'timeout' => self::downRecord(null, "Request exceeded timeout of {$monitorTimeoutMs}ms", $current),
                default => self::upRecord(rand(5, 50), $current),
            };

            $current = $current->copy()->addSeconds($intervalSeconds);
        }

        return $records;
    }

    /**
     * @return array{status: string, status_code: int, response_time: int, message: null, created_at: Carbon}
     */
    private static function upRecord(int $latencyMs, Carbon $at): array
    {
        return [
            'status' => 'up',
            'status_code' => 200,
            'response_time' => $latencyMs,
            'message' => null,
            'created_at' => $at->copy(),
        ];
    }

    /**
     * @return array{status: string, status_code: int|null, response_time: null, message: string, created_at: Carbon}
     */
    private static function downRecord(?int $statusCode, string $message, Carbon $at): array
    {
        return [
            'status' => 'down',
            'status_code' => $statusCode,
            'response_time' => null,
            'message' => $message,
            'created_at' => $at->copy(),
        ];
    }

    /**
     * Split a total response time across the curl phase counters with realistic
     * proportions so the Response tab has demo-quality phase data.
     *
     * @return array{phase_dns_ms: int, phase_tcp_ms: int, phase_tls_ms: ?int, phase_ttfb_ms: int, phase_transfer_ms: int}
     */
    private static function syntheticPhases(int $totalMs, bool $isHttps): array
    {
        $totalMs = max(1, $totalMs);
        $dnsPct = mt_rand(5, 12) / 100;
        $tcpPct = mt_rand(5, 12) / 100;
        $tlsPct = $isHttps ? mt_rand(12, 22) / 100 : 0;
        $ttfbPct = mt_rand(45, 60) / 100;

        $dns = max(1, (int) round($totalMs * $dnsPct));
        $tcp = max(1, (int) round($totalMs * $tcpPct));
        $tls = $isHttps ? max(1, (int) round($totalMs * $tlsPct)) : null;
        $ttfb = max(1, (int) round($totalMs * $ttfbPct));
        $allocated = $dns + $tcp + ($tls ?? 0) + $ttfb;
        $transfer = max(1, $totalMs - $allocated);

        return [
            'phase_dns_ms' => $dns,
            'phase_tcp_ms' => $tcp,
            'phase_tls_ms' => $tls,
            'phase_ttfb_ms' => $ttfb,
            'phase_transfer_ms' => $transfer,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function definitions(int $userId, int $teamId): array
    {
        $base = ['user_id' => $userId, 'team_id' => $teamId, 'is_active' => true, 'retry_count' => 1, 'timeout' => 10];

        $definitions = [
            // ── HTTPS retained for SSL monitoring demos ──────────────────────
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
        ];

        // ── Local fake-server fleet (driven by registry) ─────────────────────
        $persistentDownKinds = ['down_500', 'unbound', 'timeout'];
        $persistentDownCauses = [
            'down_500' => 'HTTP 500 Internal Server Error',
            'unbound' => 'Connection refused',
            'timeout' => 'Request exceeded monitor timeout',
        ];

        $fakeServerHost = config('services.fake_servers.host', '127.0.0.1');

        foreach (DevFakeServersCommand::profileRegistry() as $port => $profile) {
            $isPersistentDown = in_array($profile['kind'], $persistentDownKinds, true);

            $definitions[] = [
                ...$base,
                'name' => $profile['name'],
                'type' => 'http',
                'url' => "http://{$fakeServerHost}:{$port}",
                'method' => 'GET',
                'interval' => $profile['interval'],
                'accepted_status_codes' => [200],
                'status' => $isPersistentDown ? 'down' : 'up',
                'ssl_monitoring_enabled' => false,
                'heartbeats' => self::localServerHistory(24, $profile['interval'], $profile),
                'incidents' => $isPersistentDown ? [
                    [
                        'started_at' => now()->subHours(24),
                        'resolved_at' => null,
                        'cause' => $persistentDownCauses[$profile['kind']],
                    ],
                ] : [],
            ];
        }

        // ── Synthetic non-HTTP monitors retained ─────────────────────────────
        return array_merge($definitions, [
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
        ]);
    }
}
