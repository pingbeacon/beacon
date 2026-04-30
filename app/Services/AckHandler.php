<?php

namespace App\Services;

use App\Enums\AckStatus;
use App\Models\Incident;
use Illuminate\Support\Facades\DB;

final class AckHandler
{
    public function ack(string $token, ?int $userId = null): AckResult
    {
        if ($token === '') {
            return new AckResult(AckStatus::InvalidToken);
        }

        return DB::transaction(function () use ($token, $userId): AckResult {
            $incident = Incident::query()
                ->where('ack_token', $token)
                ->lockForUpdate()
                ->first();

            if ($incident === null) {
                return new AckResult(AckStatus::InvalidToken);
            }

            if ($incident->resolved_at !== null) {
                return new AckResult(AckStatus::Resolved, $incident);
            }

            if ($incident->acked_at !== null) {
                return new AckResult(AckStatus::AlreadyAcked, $incident);
            }

            $incident->forceFill([
                'acked_at' => now(),
                'acked_by' => $userId,
            ])->save();

            return new AckResult(AckStatus::Acked, $incident);
        });
    }
}
