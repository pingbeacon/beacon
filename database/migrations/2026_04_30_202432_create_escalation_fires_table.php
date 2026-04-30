<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escalation_fires', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained()->cascadeOnDelete();
            $table->foreignId('escalation_step_id')->constrained()->cascadeOnDelete();
            $table->timestamp('fired_at');
            $table->timestamps();

            $table->unique(['incident_id', 'escalation_step_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalation_fires');
    }
};
