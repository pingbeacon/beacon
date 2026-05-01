<?php

namespace App\DTOs;

final class DryRunResult
{
    public function __construct(
        public string $verdict,
        public string $type,
        public string $expression,
        public ?string $actualValue,
        public ?string $parseError,
        public float $evaluationMs,
    ) {}

    /**
     * @return array{verdict: string, type: string, expression: string, actual_value: ?string, parse_error: ?string, evaluation_ms: float}
     */
    public function toArray(): array
    {
        return [
            'verdict' => $this->verdict,
            'type' => $this->type,
            'expression' => $this->expression,
            'actual_value' => $this->actualValue,
            'parse_error' => $this->parseError,
            'evaluation_ms' => $this->evaluationMs,
        ];
    }
}
