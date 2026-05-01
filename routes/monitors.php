<?php

use App\Http\Controllers\AssertionController;
use App\Http\Controllers\BulkDeleteMonitorsController;
use App\Http\Controllers\BulkPauseMonitorsController;
use App\Http\Controllers\BulkResumeMonitorsController;
use App\Http\Controllers\CheckSslCertificateController;
use App\Http\Controllers\ExportMonitorsController;
use App\Http\Controllers\FiredTodayDeliveriesController;
use App\Http\Controllers\ImportMonitorsController;
use App\Http\Controllers\MaintenanceWindowController;
use App\Http\Controllers\MonitorController;
use App\Http\Controllers\MonitorDryRunController;
use App\Http\Controllers\MonitorGroupController;
use App\Http\Controllers\MonitorGroupReorderController;
use App\Http\Controllers\MonitorIncidentHeatmapController;
use App\Http\Controllers\MonitorNotificationDeliveryController;
use App\Http\Controllers\MonitorPhaseTimingsController;
use App\Http\Controllers\MonitorRestoreController;
use App\Http\Controllers\MonitorToggleController;
use App\Http\Controllers\NotificationChannelController;
use App\Http\Controllers\NotificationChannelTestController;
use App\Http\Controllers\NotificationRouteController;
use App\Http\Controllers\StatusPageController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TestNowMonitorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('monitor-groups', [MonitorGroupController::class, 'store'])->name('monitor-groups.store');
    Route::patch('monitor-groups/{monitorGroup}', [MonitorGroupController::class, 'update'])->name('monitor-groups.update');
    Route::delete('monitor-groups/{monitorGroup}', [MonitorGroupController::class, 'destroy'])->name('monitor-groups.destroy');
    Route::post('monitor-groups/reorder', MonitorGroupReorderController::class)->name('monitor-groups.reorder');

    Route::post('monitors/bulk/pause', BulkPauseMonitorsController::class)->name('monitors.bulk.pause');
    Route::post('monitors/bulk/resume', BulkResumeMonitorsController::class)->name('monitors.bulk.resume');
    Route::post('monitors/bulk/delete', BulkDeleteMonitorsController::class)->name('monitors.bulk.delete');
    Route::get('monitors/export', ExportMonitorsController::class)->name('monitors.export');
    Route::post('monitors/import', ImportMonitorsController::class)->name('monitors.import');
    Route::post('monitors/test-now', TestNowMonitorController::class)->name('monitors.test-now');

    Route::resource('monitors', MonitorController::class);
    Route::post('monitors/{monitor}/toggle', MonitorToggleController::class)->name('monitors.toggle');
    Route::post('monitors/{monitor}/check-ssl', CheckSslCertificateController::class)->name('monitors.check-ssl');
    Route::get('monitors-trashed', [MonitorController::class, 'trashed'])->name('monitors.trashed');
    Route::post('monitors/{monitor}/restore', MonitorRestoreController::class)->name('monitors.restore');
    Route::delete('monitors/{monitor}/force-delete', [MonitorController::class, 'forceDelete'])->name('monitors.force-delete');

    Route::post('tags', [TagController::class, 'store'])->name('tags.store');
    Route::patch('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

    Route::resource('notification-channels', NotificationChannelController::class)->except(['show']);
    Route::post('notification-channels/{notificationChannel}/test', NotificationChannelTestController::class)->name('notification-channels.test');

    Route::get('notification-deliveries/fired-today', FiredTodayDeliveriesController::class)->name('notification-deliveries.fired-today');

    Route::get('monitors/{monitor}/notification-deliveries', [MonitorNotificationDeliveryController::class, 'index'])->name('monitors.notification-deliveries.index');
    Route::get('monitors/{monitor}/phase-timings', MonitorPhaseTimingsController::class)->name('monitors.phase-timings');
    Route::get('monitors/{monitor}/incident-heatmap', MonitorIncidentHeatmapController::class)->name('monitors.incident-heatmap');

    Route::post('monitors/{monitor}/assertions', [AssertionController::class, 'store'])->name('monitors.assertions.store');
    Route::patch('monitors/{monitor}/assertions/{assertion}', [AssertionController::class, 'update'])->name('monitors.assertions.update');
    Route::delete('monitors/{monitor}/assertions/{assertion}', [AssertionController::class, 'destroy'])->name('monitors.assertions.destroy');
    Route::post('monitors/{monitor}/dry-run', MonitorDryRunController::class)->name('monitors.dry-run');

    Route::post('monitors/{monitor}/notification-routes', [NotificationRouteController::class, 'store'])->name('monitors.notification-routes.store');
    Route::patch('monitors/{monitor}/notification-routes/{notificationRoute}', [NotificationRouteController::class, 'update'])->name('monitors.notification-routes.update');
    Route::delete('monitors/{monitor}/notification-routes/{notificationRoute}', [NotificationRouteController::class, 'destroy'])->name('monitors.notification-routes.destroy');
    Route::post('monitors/{monitor}/notification-routes/reorder', [NotificationRouteController::class, 'reorder'])->name('monitors.notification-routes.reorder');

    Route::resource('status-pages', StatusPageController::class)->except(['show']);

    Route::resource('maintenance-windows', MaintenanceWindowController::class)->except(['show']);
});
