<?php

namespace App\Policies;

use App\Models\MonitorGroup;
use App\Models\User;

class MonitorGroupPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MonitorGroup $monitorGroup): bool
    {
        return $user->current_team_id === $monitorGroup->team_id;
    }

    public function create(User $user): bool
    {
        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, MonitorGroup $monitorGroup): bool
    {
        if ($user->current_team_id !== $monitorGroup->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, MonitorGroup $monitorGroup): bool
    {
        if ($user->current_team_id !== $monitorGroup->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }

    public function restore(User $user, MonitorGroup $monitorGroup): bool
    {
        return $this->delete($user, $monitorGroup);
    }

    public function forceDelete(User $user, MonitorGroup $monitorGroup): bool
    {
        return $this->delete($user, $monitorGroup);
    }
}
