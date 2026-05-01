<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assertion_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assertion_id')->constrained()->cascadeOnDelete();
            $table->foreignId('heartbeat_id')->constrained()->cascadeOnDelete();
            $table->boolean('passed');
            $table->string('actual_value', 1024)->nullable();
            $table->timestamp('observed_at');

            $table->index(['assertion_id', 'observed_at']);
            $table->index('heartbeat_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assertion_results');
    }
};
