<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNotificationChannelRequest;
use App\Models\NotificationChannel;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;

class NotificationChannelController extends Controller
{
    /**
     * Display a listing of notification channels for the authenticated user.
     */
    public function index(): Response
    {
        $channels = NotificationChannel::query()
            ->where('team_id', auth()->user()->current_team_id)
            ->orderBy('name')
            ->get();

        return inertia('notification-channels/index', [
            'channels' => $channels,
        ]);
    }

    /**
     * Show the form for creating a new notification channel.
     */
    public function create(): Response
    {
        return inertia('notification-channels/create');
    }

    /**
     * Store a newly created notification channel in storage.
     */
    public function store(StoreNotificationChannelRequest $request): RedirectResponse
    {
        NotificationChannel::query()->create([
            ...$request->validated(),
            'user_id' => auth()->id(),
            'team_id' => auth()->user()->current_team_id,
        ]);

        flash(__('Notification channel created successfully.'));

        return to_route('notification-channels.index');
    }

    /**
     * Show the form for editing the specified notification channel.
     */
    public function edit(NotificationChannel $notificationChannel): Response
    {
        $this->authorize('update', $notificationChannel);

        return inertia('notification-channels/edit', [
            'channel' => $notificationChannel,
        ]);
    }

    /**
     * Update the specified notification channel in storage.
     */
    public function update(StoreNotificationChannelRequest $request, NotificationChannel $notificationChannel): RedirectResponse
    {
        $this->authorize('update', $notificationChannel);

        $notificationChannel->update($request->validated());

        flash(__('Notification channel updated successfully.'));

        return back();
    }

    /**
     * Remove the specified notification channel from storage.
     */
    public function destroy(NotificationChannel $notificationChannel): RedirectResponse
    {
        $this->authorize('delete', $notificationChannel);

        $notificationChannel->delete();

        flash(__('Notification channel deleted successfully.'));

        return to_route('notification-channels.index');
    }
}
