<?php

namespace App\DTOs;

class ImportResult
{
    public function __construct(
        public int $monitorsCreated = 0,
        public int $groupsCreated = 0,
        public int $tagsCreated = 0,
        /** @var string[] */
        public array $errors = [],
    ) {}

    /**
     * @return array{monitors_created: int, groups_created: int, tags_created: int, errors: string[]}
     */
    public function toArray(): array
    {
        return [
            'monitors_created' => $this->monitorsCreated,
            'groups_created' => $this->groupsCreated,
            'tags_created' => $this->tagsCreated,
            'errors' => $this->errors,
        ];
    }
}
