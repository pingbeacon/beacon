<?php

namespace App\Http\Controllers;

use App\Models\StatusPage;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Response;

class PublicStatusPageController extends Controller
{
    /**
     * Display the public status page.
     */
    public function __invoke(Request $request, StatusPage $statusPage): Response
    {
        abort_if(! $statusPage->is_published, 404);

        $statusPage->load(['monitors' => function ($query) {
            $query->with(['tags', 'heartbeats' => fn ($q) => $q->latest()->limit(90)]);
        }]);

        $monitors = $statusPage->monitors->map(function ($monitor) {
            $heartbeats = $monitor->heartbeats;
            $total = $heartbeats->count();
            $upCount = $heartbeats->where('status', 'up')->count();
            $uptimePercentage = $total > 0 ? round(($upCount / $total) * 100, 2) : 100.0;

            return [
                'id' => $monitor->id,
                'name' => $monitor->name,
                'status' => $monitor->status,
                'tags' => $monitor->tags,
                'heartbeats' => $heartbeats->values(),
                'uptime_percentage' => $uptimePercentage,
            ];
        });

        $overallStatus = $this->calculateOverallStatus($monitors);

        return inertia('status/show', [
            'statusPage' => [
                'id' => $statusPage->id,
                'title' => $statusPage->title,
                'description' => $statusPage->description,
                'slug' => $statusPage->slug,
                'logo_path' => $statusPage->logo_path,
                'favicon_path' => $statusPage->favicon_path,
                'primary_color' => $statusPage->primary_color,
                'background_color' => $statusPage->background_color,
                'text_color' => $statusPage->text_color,
                'custom_css' => $statusPage->custom_css,
                'header_text' => $statusPage->header_text,
                'footer_text' => $statusPage->footer_text,
                'show_powered_by' => $statusPage->show_powered_by,
            ],
            'monitors' => $monitors,
            'overallStatus' => $overallStatus,
        ]);
    }

    /**
     * Calculate the overall status based on all monitors.
     *
     * @param  Collection<int, array<string, mixed>>  $monitors
     */
    private function calculateOverallStatus(Collection $monitors): string
    {
        if ($monitors->isEmpty()) {
            return 'operational';
        }

        $activeMonitors = $monitors->filter(fn ($m) => $m['status'] !== 'paused' && $m['status'] !== 'pending');

        if ($activeMonitors->isEmpty()) {
            return 'operational';
        }

        $downCount = $activeMonitors->filter(fn ($m) => $m['status'] === 'down')->count();

        if ($downCount === 0) {
            return 'operational';
        }

        if ($downCount === $activeMonitors->count()) {
            return 'major_outage';
        }

        return 'degraded';
    }
}
