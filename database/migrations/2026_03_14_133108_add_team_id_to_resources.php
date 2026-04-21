<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var string[] */
    protected array $resourceTables = [
        'monitors',
        'notification_channels',
        'status_pages',
        'tags',
        'monitor_groups',
        'maintenance_windows',
        'app_settings',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->resourceTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('team_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->resourceTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('team_id');
            });
        }
    }
};
