<?php

namespace App\Enums;

enum TeamRole: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Member = 'member';
    case Viewer = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner',
            self::Admin => 'Admin',
            self::Member => 'Member',
            self::Viewer => 'Viewer',
        };
    }

    public function canManageTeam(): bool
    {
        return match ($this) {
            self::Owner => true,
            self::Admin => true,
            default => false,
        };
    }

    public function canManageMembers(): bool
    {
        return match ($this) {
            self::Owner => true,
            self::Admin => true,
            default => false,
        };
    }

    public function canCreate(): bool
    {
        return $this !== self::Viewer;
    }

    public function canUpdate(): bool
    {
        return $this !== self::Viewer;
    }

    public function canDelete(): bool
    {
        return match ($this) {
            self::Owner, self::Admin => true,
            default => false,
        };
    }
}
