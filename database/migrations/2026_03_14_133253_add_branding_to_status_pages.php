<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('status_pages', function (Blueprint $table) {
            $table->string('logo_path')->nullable();
            $table->string('favicon_path')->nullable();
            $table->string('primary_color')->nullable()->default('#3b82f6');
            $table->string('background_color')->nullable();
            $table->string('text_color')->nullable();
            $table->text('custom_css')->nullable();
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();
            $table->string('custom_domain')->nullable()->unique();
            $table->boolean('show_powered_by')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('status_pages', function (Blueprint $table) {
            $table->dropColumn([
                'logo_path', 'favicon_path', 'primary_color', 'background_color',
                'text_color', 'custom_css', 'header_text', 'footer_text',
                'custom_domain', 'show_powered_by',
            ]);
        });
    }
};
