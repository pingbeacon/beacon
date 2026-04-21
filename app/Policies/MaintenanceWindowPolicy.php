<?php

namespace App\Policies;

use App\Models\MaintenanceWindow;
use App\Models\User;

class MaintenanceWindowPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        return $user->current_team_id === $maintenanceWindow->team_id;
    }

    public function create(User $user): bool
    {
        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        if ($user->current_team_id !== $maintenanceWindow->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        if ($user->current_team_id !== $maintenanceWindow->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }

    public function restore(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        return $this->delete($user, $maintenanceWindow);
    }

    public function forceDelete(User $user, MaintenanceWindow $maintenanceWindow): bool
    {
        return $this->delete($user, $maintenanceWindow);
    }
}
