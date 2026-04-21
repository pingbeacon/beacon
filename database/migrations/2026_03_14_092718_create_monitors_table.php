<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type'); // http, tcp, ping, dns, push
            $table->string('url')->nullable();
            $table->string('host')->nullable();
            $table->unsignedInteger('port')->nullable();
            $table->string('dns_record_type')->nullable();
            $table->string('method')->default('GET');
            $table->text('body')->nullable();
            $table->json('headers')->nullable();
            $table->json('accepted_status_codes')->nullable();
            $table->unsignedInteger('interval')->default(60);
            $table->unsignedInteger('timeout')->default(30);
            $table->unsignedInteger('retry_count')->default(3);
            $table->string('status')->default('pending'); // up, down, pending, paused
            $table->boolean('is_active')->default(true);
            $table->string('push_token')->unique()->nullable();
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('next_check_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monitors');
    }
};
