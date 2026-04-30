<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('channel_id')->constrained('notification_channels')->cascadeOnDelete();
            $table->foreignId('monitor_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('incident_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type');
            $table->string('status');
            $table->unsignedInteger('latency_ms')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('dispatched_at');
            $table->timestamps();

            $table->index(['channel_id', 'dispatched_at']);
            $table->index(['team_id', 'dispatched_at']);
            $table->index(['monitor_id', 'dispatched_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_deliveries');
    }
};
