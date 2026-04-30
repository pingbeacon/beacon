<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incidents', function (Blueprint $table) {
            $table->timestamp('acked_at')->nullable()->after('resolved_at');
            $table->foreignId('acked_by')->nullable()->after('acked_at')->constrained('users')->nullOnDelete();
            $table->string('ack_token', 64)->nullable()->after('acked_by');
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
