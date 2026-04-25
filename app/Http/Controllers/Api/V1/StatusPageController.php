<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreStatusPageRequest;
use App\Http\Requests\Api\V1\UpdateStatusPageRequest;
use App\Http\Resources\Api\V1\StatusPageResource;
use App\Models\StatusPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StatusPageController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->tokenCan('status-pages:read'), 403, 'Insufficient token scope.');

        $perPage = max(1, min((int) $request->query('per_page', 15), 100));

        $statusPages = StatusPage::query()
            ->where('team_id', $request->user()->current_team_id)
            ->latest()
            ->paginate($perPage);

        return StatusPageResource::collection($statusPages);
    }

    public function store(StoreStatusPageRequest $request): JsonResponse
    {
        abort_unless($request->user()->tokenCan('status-pages:write'), 403, 'Insufficient token scope.');
        $this->authorize('create', StatusPage::class);

        $validated = $request->validated();

        $statusPage = StatusPage::query()->create([
            ...$validated,
            'team_id' => $request->user()->current_team_id,
            'user_id' => $request->user()->id,
        ]);

        return StatusPageResource::make($statusPage)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, StatusPage $statusPage): JsonResponse
    {
        abort_unless($request->user()->tokenCan('status-pages:read'), 403, 'Insufficient token scope.');
        $this->authorize('view', $statusPage);

        return StatusPageResource::make($statusPage)->response();
    }

    public function update(UpdateStatusPageRequest $request, StatusPage $statusPage): JsonResponse
    {
        abort_unless($request->user()->tokenCan('status-pages:write'), 403, 'Insufficient token scope.');
        $this->authorize('update', $statusPage);

        $statusPage->update($request->validated());

        return StatusPageResource::make($statusPage->fresh())->response();
    }

    public function destroy(Request $request, StatusPage $statusPage): JsonResponse
    {
        abort_unless($request->user()->tokenCan('status-pages:write'), 403, 'Insufficient token scope.');
        $this->authorize('delete', $statusPage);

        $statusPage->delete();

        return response()->json(null, 204);
    }
}
