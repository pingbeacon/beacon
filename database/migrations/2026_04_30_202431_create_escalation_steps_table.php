<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escalation_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('escalation_policy_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('order');
            $table->unsignedInteger('delay_minutes');
            $table->json('channel_ids');
            $table->timestamps();

            $table->unique(['escalation_policy_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalation_steps');
    }
};
