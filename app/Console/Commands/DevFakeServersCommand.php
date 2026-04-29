<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class DevFakeServersCommand extends Command
{
    protected $signature = 'dev:fake-servers {--stream : Stream child server output to STDERR}';

    protected $description = 'Spawn a fleet of local fake HTTP servers (ports 9001-9020) for dev monitor targets.';

    /**
     * Profile registry — single source of truth shared with MonitorSeeder.
     *
     * Each entry keyed by port. Fields:
     *   - kind: fast|slow|jitter|spike|down_500|unbound|flap|timeout
     *   - name: monitor display name
     *   - interval: monitor check interval (seconds)
     *   - latency_min/latency_max: ms (fast/slow/jitter)
     *   - spike_outlier_pct: 0-100 (spike)
     *   - spike_outlier_ms: ms (spike)
     *   - flap_down_pct: 0-100 (flap)
     *   - sleep_seconds: float (timeout — exceeds monitor timeout of 10s)
     *   - bind: false to skip spawning (unbound)
     *
     * @return array<int, array<string, mixed>>
     */
    public static function profileRegistry(): array
    {
        $registry = [];

        foreach (range(9001, 9004) as $port) {
            $registry[$port] = [
                'kind' => 'fast',
                'name' => "Fast API :{$port}",
                'interval' => 30,
                'latency_min' => 5,
                'latency_max' => 50,
                'bind' => true,
            ];
        }

        foreach (range(9005, 9007) as $port) {
            $registry[$port] = [
                'kind' => 'slow',
                'name' => "Slow API :{$port}",
                'interval' => 60,
                'latency_min' => 500,
                'latency_max' => 1500,
                'bind' => true,
            ];
        }

        foreach (range(9008, 9011) as $port) {
            $registry[$port] = [
                'kind' => 'jitter',
                'name' => "Jittery API :{$port}",
                'interval' => 60,
                'latency_min' => 10,
                'latency_max' => 2000,
                'bind' => true,
            ];
        }

        foreach (range(9012, 9013) as $port) {
            $registry[$port] = [
                'kind' => 'spike',
                'name' => "Spiky API :{$port}",
                'interval' => 30,
                'latency_min' => 5,
                'latency_max' => 50,
                'spike_outlier_pct' => 10,
                'spike_outlier_ms' => 3000,
                'bind' => true,
            ];
        }

        foreach (range(9014, 9015) as $port) {
            $registry[$port] = [
                'kind' => 'down_500',
                'name' => "Always-500 Service :{$port}",
                'interval' => 60,
                'bind' => true,
            ];
        }

        foreach (range(9016, 9017) as $port) {
            $registry[$port] = [
                'kind' => 'unbound',
                'name' => "Unbound Port :{$port}",
                'interval' => 60,
                'bind' => false,
            ];
        }

        foreach (range(9018, 9019) as $port) {
            $registry[$port] = [
                'kind' => 'flap',
                'name' => "Flapping Service :{$port}",
                'interval' => 30,
                'flap_down_pct' => 20,
                'bind' => true,
            ];
        }

        $registry[9020] = [
            'kind' => 'timeout',
            'name' => 'Timeout API :9020',
            'interval' => 120,
            'sleep_seconds' => 15,
            'bind' => true,
        ];

        return $registry;
    }

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->warn('dev:fake-servers refuses to run outside the local environment.');

            return self::FAILURE;
        }

        $router = base_path('bin/dev-fake-server-router.php');
        if (! is_file($router)) {
            $this->error("Router script not found: {$router}");

            return self::FAILURE;
        }

        $stream = (bool) $this->option('stream');

        /** @var array<int, Process> $processes */
        $processes = [];

        foreach (self::profileRegistry() as $port => $profile) {
            if (empty($profile['bind'])) {
                continue;
            }

            if ($this->isPortBound($port)) {
                $this->error("Port {$port} is already in use. Free it and retry.");
                $this->stopAll($processes);

                return self::FAILURE;
            }

            $process = new Process(
                [PHP_BINARY, '-S', "127.0.0.1:{$port}", $router],
                base_path(),
                ['FAKE_SERVER_PROFILE' => json_encode($profile)],
            );
            $process->setTimeout(null);
            $process->start(function ($type, $buffer) use ($port, $stream) {
                if ($stream) {
                    fwrite(STDERR, "[fake:{$port}] {$buffer}");
                }
            });

            $processes[$port] = $process;
            $this->line("fake-server up on 127.0.0.1:{$port} ({$profile['kind']})");
        }

        $this->registerSignalHandlers($processes);

        while (! empty($processes)) {
            foreach ($processes as $port => $process) {
                if (! $process->isRunning()) {
                    $this->warn("fake-server on port {$port} exited (code ".($process->getExitCode() ?? 'null').'). Leaving dead.');
                    unset($processes[$port]);

                    continue;
                }
            }

            if (function_exists('pcntl_signal_dispatch')) {
                pcntl_signal_dispatch();
            }

            usleep(250_000);
        }

        return self::SUCCESS;
    }

    private function isPortBound(int $port): bool
    {
        $socket = @stream_socket_client("tcp://127.0.0.1:{$port}", $errno, $errstr, 0.2);
        if ($socket) {
            fclose($socket);

            return true;
        }

        return false;
    }

    /**
     * @param  array<int, Process>  $processes
     */
    private function registerSignalHandlers(array &$processes): void
    {
        if (! function_exists('pcntl_signal')) {
            return;
        }

        $handler = function () use (&$processes) {
            $this->stopAll($processes);
            $processes = [];
        };

        pcntl_async_signals(true);
        pcntl_signal(SIGINT, $handler);
        pcntl_signal(SIGTERM, $handler);
    }

    /**
     * @param  array<int, Process>  $processes
     */
    private function stopAll(array $processes): void
    {
        foreach ($processes as $process) {
            if ($process->isRunning()) {
                $process->stop(2);
            }
        }
    }
}
