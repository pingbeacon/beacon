<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApiTokenRequest;
use App\Http\Resources\Api\V1\ApiTokenResource;
use Carbon\Carbon;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
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

        $expiresAt = match ($validated['expires_at'] ?? null) {
            '30d' => Carbon::now()->addDays(30),
            '90d' => Carbon::now()->addDays(90),
            '1y' => Carbon::now()->addYear(),
            default => null,
        };

        $abilities = array_merge(["team:{$teamId}"], $validated['scopes']);

        $lock = Cache::lock("api-tokens:user:{$user->id}:team:{$teamId}", 5);

        try {
            $lock->block(3);

            $existingCount = $user->tokens()
                ->where('abilities', 'like', "%\"team:{$teamId}\"%")
                ->count();

            if ($existingCount >= self::TOKEN_LIMIT) {
                throw ValidationException::withMessages([
                    'team_id' => 'Token limit reached for this team.',
                ]);
            }

            $token = $user->createToken(
                $validated['name'],
                $abilities,
                $expiresAt,
            );
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'team_id' => 'Another request is creating a token for this team. Please retry.',
            ]);
        } finally {
            optional($lock)->release();
        }

        flash('Token created.', ['token' => $token->plainTextToken]);

        return to_route('settings.api-tokens.index');
    }

    public function destroy(Request $request, int $tokenId): RedirectResponse
    {
        abort_unless($request->user()->tokens()->where('id', $tokenId)->exists(), 403);

        $request->user()->tokens()->where('id', $tokenId)->delete();

        return to_route('settings.api-tokens.index');
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        $request->user()->tokens()->delete();

        return to_route('settings.api-tokens.index');
    }
}
