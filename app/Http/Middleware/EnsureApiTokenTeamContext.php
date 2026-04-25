<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiTokenTeamContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $abilities = $user->currentAccessToken()->abilities ?? [];

        $teamAbility = collect($abilities)->first(fn ($a) => str_starts_with($a, 'team:'));

        if (! $teamAbility) {
            return response()->json([
                'message' => 'Token is not scoped to a team.',
                'code' => 'unauthorized',
            ], 403);
        }

        $teamId = (int) substr($teamAbility, 5);

        if (! $user->teams()->where('teams.id', $teamId)->exists()) {
            return response()->json([
                'message' => 'Token team not accessible.',
                'code' => 'unauthorized',
            ], 403);
        }

        $user->current_team_id = $teamId;

        return $next($request);
    }
}
