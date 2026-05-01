<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assertions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['status', 'latency', 'body', 'header', 'content_type']);
            $table->string('expression');
            $table->string('name')->nullable();
            $table->enum('severity', ['critical', 'warning', 'info'])->default('warning');
            $table->enum('on_fail', ['open_incident', 'log_only'])->default('log_only');
            $table->boolean('muted')->default(false);
            $table->unsignedSmallInteger('tolerance')->default(1);
            $table->timestamps();

            $table->index(['monitor_id', 'muted']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assertions');
    }
};
