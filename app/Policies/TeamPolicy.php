<?php

namespace App\Policies;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Team $team): bool
    {
        return $user->belongsToTeam($team);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Team $team): bool
    {
        if (! $user->belongsToTeam($team)) {
            return false;
        }

        $role = $user->teamRole($team);

        return $role->canManageTeam();
    }

    public function delete(User $user, Team $team): bool
    {
        if ($team->personal_team) {
            return false;
        }

        if (! $user->belongsToTeam($team)) {
            return false;
        }

        $role = $user->teamRole($team);

        return $role === TeamRole::Owner;
    }

    public function manageMembers(User $user, Team $team): bool
    {
        if (! $user->belongsToTeam($team)) {
            return false;
        }

        $role = $user->teamRole($team);

        return $role->canManageMembers();
    }
}
