<?php

namespace App\Policies;

use App\Models\NotificationChannel;
use App\Models\User;

class NotificationChannelPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, NotificationChannel $notificationChannel): bool
    {
        return $user->current_team_id === $notificationChannel->team_id;
    }

    public function create(User $user): bool
    {
        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, NotificationChannel $notificationChannel): bool
    {
        if ($user->current_team_id !== $notificationChannel->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, NotificationChannel $notificationChannel): bool
    {
        if ($user->current_team_id !== $notificationChannel->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }

    public function restore(User $user, NotificationChannel $notificationChannel): bool
    {
        return $this->delete($user, $notificationChannel);
    }

    public function forceDelete(User $user, NotificationChannel $notificationChannel): bool
    {
        return $this->delete($user, $notificationChannel);
    }
}
