<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('heartbeats', function (Blueprint $table) {
            $table->unsignedInteger('phase_dns_ms')->nullable()->after('response_time');
            $table->unsignedInteger('phase_tcp_ms')->nullable()->after('phase_dns_ms');
            $table->unsignedInteger('phase_tls_ms')->nullable()->after('phase_tcp_ms');
            $table->unsignedInteger('phase_ttfb_ms')->nullable()->after('phase_tls_ms');
            $table->unsignedInteger('phase_transfer_ms')->nullable()->after('phase_ttfb_ms');
        });
    }

    public function down(): void
    {
        Schema::table('heartbeats', function (Blueprint $table) {
            $table->dropColumn([
                'phase_dns_ms',
                'phase_tcp_ms',
                'phase_tls_ms',
                'phase_ttfb_ms',
                'phase_transfer_ms',
            ]);
        });
    }
};
