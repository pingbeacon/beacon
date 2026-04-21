<?php

namespace App\Policies;

use App\Models\StatusPage;
use App\Models\User;

class StatusPagePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, StatusPage $statusPage): bool
    {
        return $user->current_team_id === $statusPage->team_id;
    }

    public function create(User $user): bool
    {
        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, StatusPage $statusPage): bool
    {
        if ($user->current_team_id !== $statusPage->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, StatusPage $statusPage): bool
    {
        if ($user->current_team_id !== $statusPage->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }

    public function restore(User $user, StatusPage $statusPage): bool
    {
        return $this->delete($user, $statusPage);
    }

    public function forceDelete(User $user, StatusPage $statusPage): bool
    {
        return $this->delete($user, $statusPage);
    }
}
