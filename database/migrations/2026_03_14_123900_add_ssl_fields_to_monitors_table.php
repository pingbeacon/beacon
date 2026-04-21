<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monitors', function (Blueprint $table) {
            $table->boolean('ssl_monitoring_enabled')->default(false)->after('is_active');
            $table->json('ssl_expiry_notification_days')->nullable()->after('ssl_monitoring_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('monitors', function (Blueprint $table) {
            $table->dropColumn(['ssl_monitoring_enabled', 'ssl_expiry_notification_days']);
        });
    }
};
