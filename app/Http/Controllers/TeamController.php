<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTeamRequest;
use App\Http\Requests\UpdateTeamRequest;
use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Response;

class TeamController extends Controller
{
    public function index(): Response
    {
        $teams = auth()->user()->teams()->withCount('users')->get();

        return inertia('settings/teams/index', [
            'teams' => $teams,
        ]);
    }

    public function create(): Response
    {
        return inertia('settings/teams/create');
    }

    public function store(StoreTeamRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $team = Team::query()->create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']).'-'.Str::random(5),
            'personal_team' => false,
        ]);

        $team->users()->attach($request->user()->id, ['role' => 'owner']);

        $request->user()->update(['current_team_id' => $team->id]);

        flash(__('Team created successfully.'));

        return to_route('teams.index');
    }

    public function edit(Team $team): Response
    {
        $this->authorize('update', $team);

        $team->load(['users' => function ($query) {
            $query->select('users.id', 'users.name', 'users.email');
        }]);

        return inertia('settings/teams/edit', [
            'team' => $team,
        ]);
    }

    public function update(UpdateTeamRequest $request, Team $team): RedirectResponse
    {
        $this->authorize('update', $team);

        $team->update($request->validated());

        flash(__('Team updated successfully.'));

        return back();
    }

    public function destroy(Team $team): RedirectResponse
    {
        $this->authorize('delete', $team);

        $user = auth()->user();

        $team->delete();

        if ($user->current_team_id === $team->id) {
            $firstTeam = $user->teams()->first();
            $user->update(['current_team_id' => $firstTeam?->id]);
        }

        flash(__('Team deleted successfully.'));

        return to_route('teams.index');
    }
}
