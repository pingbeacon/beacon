<?php

namespace App\Policies;

use App\Models\Monitor;
use App\Models\User;

class MonitorPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Monitor $monitor): bool
    {
        return $user->current_team_id === $monitor->team_id;
    }

    public function create(User $user): bool
    {
        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, Monitor $monitor): bool
    {
        if ($user->current_team_id !== $monitor->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, Monitor $monitor): bool
    {
        if ($user->current_team_id !== $monitor->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }

    public function restore(User $user, Monitor $monitor): bool
    {
        return $this->delete($user, $monitor);
    }

    public function forceDelete(User $user, Monitor $monitor): bool
    {
        return $this->delete($user, $monitor);
    }
}
