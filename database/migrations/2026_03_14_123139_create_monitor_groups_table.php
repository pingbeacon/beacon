<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monitor_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('monitor_groups')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_collapsed')->default(false);
            $table->timestamps();
        });

        Schema::table('monitors', function (Blueprint $table) {
            $table->foreignId('monitor_group_id')->nullable()->after('user_id')->constrained('monitor_groups')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0)->after('next_check_at');
        });
    }

    public function down(): void
    {
        Schema::table('monitors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('monitor_group_id');
            $table->dropColumn('sort_order');
        });

        Schema::dropIfExists('monitor_groups');
    }
};
