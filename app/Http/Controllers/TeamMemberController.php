<?php

namespace App\Http\Controllers;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeamMemberController extends Controller
{
    public function store(Request $request, Team $team): RedirectResponse
    {
        $this->authorize('manageMembers', $team);

        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['required', Rule::in(['admin', 'member', 'viewer'])],
        ]);

        $user = User::where('email', $validated['email'])->firstOrFail();

        if ($team->users()->where('user_id', $user->id)->exists()) {
            flash(__('User is already a member of this team.'), 'error');

            return back();
        }

        $team->users()->attach($user->id, ['role' => $validated['role']]);

        flash(__('Team member added successfully.'));

        return back();
    }

    public function update(Request $request, Team $team, User $user): RedirectResponse
    {
        $this->authorize('manageMembers', $team);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['admin', 'member', 'viewer'])],
        ]);

        $memberRole = $user->teamRole($team);

        if ($memberRole === TeamRole::Owner) {
            flash(__('Cannot change the owner\'s role.'), 'error');

            return back();
        }

        $team->users()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        flash(__('Member role updated successfully.'));

        return back();
    }

    public function destroy(Team $team, User $user): RedirectResponse
    {
        $this->authorize('manageMembers', $team);

        $memberRole = $user->teamRole($team);

        if ($memberRole === TeamRole::Owner) {
            flash(__('Cannot remove the team owner.'), 'error');

            return back();
        }

        $team->users()->detach($user->id);

        if ($user->current_team_id === $team->id) {
            $firstTeam = $user->teams()->first();
            $user->update(['current_team_id' => $firstTeam?->id]);
        }

        flash(__('Team member removed successfully.'));

        return back();
    }
}
