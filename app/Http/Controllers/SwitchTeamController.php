<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\RedirectResponse;

class SwitchTeamController extends Controller
{
    public function __invoke(Team $team): RedirectResponse
    {
        $user = auth()->user();

        if (! $user->belongsToTeam($team)) {
            abort(403);
        }

        $user->update(['current_team_id' => $team->id]);

        flash(__('Switched to :team.', ['team' => $team->name]));

        return to_route('dashboard');
    }
}
