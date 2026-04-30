<?php

namespace App\Policies;

use App\Models\NotificationRoute;
use App\Models\User;

class NotificationRoutePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, NotificationRoute $notificationRoute): bool
    {
        return $user->current_team_id === $notificationRoute->team_id;
    }

    public function create(User $user): bool
    {
        if ($user->currentTeam === null) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, NotificationRoute $notificationRoute): bool
    {
        if ($user->current_team_id !== $notificationRoute->team_id) {
            return false;
        }

        if ($user->currentTeam === null) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, NotificationRoute $notificationRoute): bool
    {
        if ($user->current_team_id !== $notificationRoute->team_id) {
            return false;
        }

        if ($user->currentTeam === null) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }
}
