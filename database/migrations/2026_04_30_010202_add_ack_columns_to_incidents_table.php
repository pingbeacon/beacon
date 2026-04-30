<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->timestamp('acked_at')->nullable()->after('resolved_at');
            $table->foreignId('acked_by')->nullable()->after('acked_at')->constrained('users')->nullOnDelete();
            $table->string('ack_token', 64)->nullable()->after('acked_by');
        });

        DB::table('incidents')
            ->whereNull('ack_token')
            ->orderBy('id')
            ->lazyById()
            ->each(function ($row) {
                DB::table('incidents')
                    ->where('id', $row->id)
                    ->update(['ack_token' => Str::random(64)]);
            });

        Schema::table('incidents', function (Blueprint $table) {
            $table->unique('ack_token');
        });
    }

    public function down(): void
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->dropUnique(['ack_token']);
            $table->dropConstrainedForeignId('acked_by');
            $table->dropColumn(['acked_at', 'ack_token']);
        });
    }
};
