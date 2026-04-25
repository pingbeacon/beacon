<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApiTokenRequest;
use App\Http\Resources\Api\V1\ApiTokenResource;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class ApiTokenController extends Controller
{
    private const TOKEN_LIMIT = 10;

    public function index(Request $request): Response
    {
        $tokens = $request->user()
            ->tokens()
            ->latest()
            ->get();

        return inertia('settings/api-tokens', [
            'tokens' => ApiTokenResource::collection($tokens),
        ]);
    }

    public function store(StoreApiTokenRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $teamId = (int) $validated['team_id'];

        abort_unless($user->teams()->where('teams.id', $teamId)->exists(), 403);

        $existingCount = $user->tokens()
            ->where('abilities', 'like', "%\"team:{$teamId}\"%")
            ->count();

        abort_if($existingCount >= self::TOKEN_LIMIT, 422, 'Token limit reached for this team.');

        $expiresAt = match ($validated['expires_at'] ?? null) {
            '30d' => Carbon::now()->addDays(30),
            '90d' => Carbon::now()->addDays(90),
            '1y' => Carbon::now()->addYear(),
            default => null,
        };

        $abilities = array_merge(["team:{$teamId}"], $validated['scopes']);

        $token = $user->createToken(
            $validated['name'],
            $abilities,
            $expiresAt,
        );

        flash('Token created.', ['token' => $token->plainTextToken]);

        return to_route('settings.api-tokens.index');
    }

    public function destroy(Request $request, int $tokenId): RedirectResponse
    {
        $request->user()->tokens()->where('id', $tokenId)->delete();

        return to_route('settings.api-tokens.index');
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        $request->user()->tokens()->delete();

        return to_route('settings.api-tokens.index');
    }
}
