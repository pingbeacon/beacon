<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStatusPageRequest;
use App\Models\Monitor;
use App\Models\StatusPage;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;

class StatusPageController extends Controller
{
    /**
     * Display a listing of the user's status pages.
     */
    public function index(): Response
    {
        $statusPages = StatusPage::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->withCount('monitors')
            ->latest()
            ->get();

        return inertia('status-pages/index', [
            'statusPages' => $statusPages,
        ]);
    }

    /**
     * Show the form for creating a new status page.
     */
    public function create(): Response
    {
        $monitors = Monitor::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get();

        return inertia('status-pages/create', [
            'monitors' => $monitors,
        ]);
    }

    /**
     * Store a newly created status page in storage.
     */
    public function store(StoreStatusPageRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $statusPage = StatusPage::query()->create([
            'team_id' => auth()->user()->current_team_id,
            'user_id' => auth()->id(),
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'is_published' => $validated['is_published'] ?? false,
            'primary_color' => $validated['primary_color'] ?? null,
            'background_color' => $validated['background_color'] ?? null,
            'text_color' => $validated['text_color'] ?? null,
            'custom_css' => $validated['custom_css'] ?? null,
            'header_text' => $validated['header_text'] ?? null,
            'footer_text' => $validated['footer_text'] ?? null,
            'custom_domain' => $validated['custom_domain'] ?? null,
            'show_powered_by' => $validated['show_powered_by'] ?? true,
        ]);

        if ($request->hasFile('logo')) {
            $statusPage->update([
                'logo_path' => $request->file('logo')->store('status-pages/logos', 'public'),
            ]);
        }

        if ($request->hasFile('favicon')) {
            $statusPage->update([
                'favicon_path' => $request->file('favicon')->store('status-pages/favicons', 'public'),
            ]);
        }

        $monitorIds = $validated['monitor_ids'] ?? [];
        $syncData = collect($monitorIds)->mapWithKeys(fn ($id, $index) => [$id => ['sort_order' => $index]])->all();
        $statusPage->monitors()->sync($syncData);

        flash(__('Status page created successfully.'));

        return to_route('status-pages.index');
    }

    /**
     * Show the form for editing the specified status page.
     */
    public function edit(StatusPage $statusPage): Response
    {
        $this->authorize('update', $statusPage);

        $statusPage->load('monitors');

        $monitors = Monitor::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get();

        return inertia('status-pages/edit', [
            'statusPage' => $statusPage,
            'monitors' => $monitors,
        ]);
    }

    /**
     * Update the specified status page in storage.
     */
    public function update(StoreStatusPageRequest $request, StatusPage $statusPage): RedirectResponse
    {
        $this->authorize('update', $statusPage);

        $validated = $request->validated();

        $statusPage->update([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'is_published' => $validated['is_published'] ?? false,
            'primary_color' => $validated['primary_color'] ?? null,
            'background_color' => $validated['background_color'] ?? null,
            'text_color' => $validated['text_color'] ?? null,
            'custom_css' => $validated['custom_css'] ?? null,
            'header_text' => $validated['header_text'] ?? null,
            'footer_text' => $validated['footer_text'] ?? null,
            'custom_domain' => $validated['custom_domain'] ?? null,
            'show_powered_by' => $validated['show_powered_by'] ?? true,
        ]);

        if ($request->hasFile('logo')) {
            $statusPage->update([
                'logo_path' => $request->file('logo')->store('status-pages/logos', 'public'),
            ]);
        }

        if ($request->hasFile('favicon')) {
            $statusPage->update([
                'favicon_path' => $request->file('favicon')->store('status-pages/favicons', 'public'),
            ]);
        }

        $monitorIds = $validated['monitor_ids'] ?? [];
        $syncData = collect($monitorIds)->mapWithKeys(fn ($id, $index) => [$id => ['sort_order' => $index]])->all();
        $statusPage->monitors()->sync($syncData);

        flash(__('Status page updated successfully.'));

        return back();
    }

    /**
     * Remove the specified status page from storage.
     */
    public function destroy(StatusPage $statusPage): RedirectResponse
    {
        $this->authorize('delete', $statusPage);

        $statusPage->delete();

        flash(__('Status page deleted successfully.'));

        return to_route('status-pages.index');
    }
}
