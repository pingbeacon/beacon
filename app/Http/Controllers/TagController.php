<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTagRequest;
use App\Models\Tag;
use Illuminate\Http\RedirectResponse;

class TagController extends Controller
{
    /**
     * Store a newly created tag in storage.
     */
    public function store(StoreTagRequest $request): RedirectResponse
    {
        Tag::query()->create([
            ...$request->validated(),
            'user_id' => auth()->id(),
            'team_id' => auth()->user()->current_team_id,
        ]);

        flash(__('Tag created successfully.'));

        return back();
    }

    /**
     * Update the specified tag in storage.
     */
    public function update(StoreTagRequest $request, Tag $tag): RedirectResponse
    {
        $this->authorize('update', $tag);

        $tag->update($request->validated());

        flash(__('Tag updated successfully.'));

        return back();
    }

    /**
     * Remove the specified tag from storage.
     */
    public function destroy(Tag $tag): RedirectResponse
    {
        $this->authorize('delete', $tag);

        $tag->delete();

        flash(__('Tag deleted successfully.'));

        return back();
    }
}
