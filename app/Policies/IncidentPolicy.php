<?php

namespace App\Policies;

use App\Models\Incident;
use App\Models\User;

class IncidentPolicy
{
    public function view(User $user, Incident $incident): bool
    {
        return $user->current_team_id === $incident->monitor->team_id;
    }

    public function acknowledge(User $user, Incident $incident): bool
    {
        if ($user->current_team_id !== $incident->monitor->team_id) {
            return false;
        }

        return $user->teamRole($user->currentTeam)->canUpdate();
    }
}
