<?php

namespace App\Http\Controllers;

use App\DTOs\AssertionPayload;
use App\Http\Requests\DryRunRequest;
use App\Models\Heartbeat;
use App\Models\Monitor;
use App\Services\Assertions\DryRunner;
use Illuminate\Http\JsonResponse;

class MonitorDryRunController extends Controller
{
    public function __construct(private DryRunner $runner) {}

    public function __invoke(DryRunRequest $request, Monitor $monitor): JsonResponse
    {
        $payload = $request->input('source') === 'heartbeat'
            ? $this->payloadFromHeartbeat($monitor, (int) $request->input('heartbeat_id'))
            : $this->payloadFromPasted($request->input('response', []));

        $result = $this->runner->run(
            type: (string) $request->input('type'),
            expression: (string) $request->input('expression'),
            payload: $payload,
        );

        return response()->json($result->toArray());
    }

    private function payloadFromHeartbeat(Monitor $monitor, int $heartbeatId): AssertionPayload
    {
        $heartbeat = Heartbeat::query()
            ->where('monitor_id', $monitor->id)
            ->findOrFail($heartbeatId);

        return new AssertionPayload(
            statusCode: $heartbeat->status_code,
            latencyMs: $heartbeat->response_time,
            body: null,
            headers: [],
            contentType: null,
        );
    }

    /**
     * @param  array<string, mixed>  $response
     */
    private function payloadFromPasted(array $response): AssertionPayload
    {
        $headers = $response['headers'] ?? [];

        return new AssertionPayload(
            statusCode: isset($response['status_code']) ? (int) $response['status_code'] : null,
            latencyMs: isset($response['latency_ms']) ? (int) $response['latency_ms'] : null,
            body: isset($response['body']) ? (string) $response['body'] : null,
            headers: is_array($headers) ? $headers : [],
            contentType: isset($response['content_type']) ? (string) $response['content_type'] : null,
        );
    }
}
