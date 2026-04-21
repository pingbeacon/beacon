<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('heartbeats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitor_id')->constrained()->cascadeOnDelete();
            $table->string('status'); // up, down
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('response_time')->nullable(); // ms
            $table->text('message')->nullable();
            $table->timestamp('created_at');

            $table->index(['monitor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('heartbeats');
    }
};
