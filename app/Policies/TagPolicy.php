<?php

namespace App\Policies;

use App\Models\Tag;
use App\Models\User;

class TagPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Tag $tag): bool
    {
        return $user->current_team_id === $tag->team_id;
    }

    public function create(User $user): bool
    {
        $role = $user->teamRole($user->currentTeam);

        return $role->canCreate();
    }

    public function update(User $user, Tag $tag): bool
    {
        if ($user->current_team_id !== $tag->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canUpdate();
    }

    public function delete(User $user, Tag $tag): bool
    {
        if ($user->current_team_id !== $tag->team_id) {
            return false;
        }

        $role = $user->teamRole($user->currentTeam);

        return $role->canDelete();
    }

    public function restore(User $user, Tag $tag): bool
    {
        return $this->delete($user, $tag);
    }

    public function forceDelete(User $user, Tag $tag): bool
    {
        return $this->delete($user, $tag);
    }
}
