<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('monitor_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->unsignedInteger('priority')->default(100);
            $table->json('conditions');
            $table->json('channel_ids');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['monitor_id', 'priority']);
            $table->index(['team_id', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_routes');
    }
};
