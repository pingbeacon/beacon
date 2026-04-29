<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\TagResource;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TagController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->tokenCan('tags:read'), 403, 'Insufficient token scope.');

        $tags = Tag::query()
            ->where('team_id', $request->user()->current_team_id)
            ->orderBy('name')
            ->paginate(min((int) $request->query('per_page', 15), 100));

        return TagResource::collection($tags);
    }
}
