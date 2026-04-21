<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
        $users = DB::table('users')->get();

        foreach ($users as $user) {
            $slug = $this->uniqueSlug($user->name);

            $teamId = DB::table('teams')->insertGetId([
                'name' => "{$user->name}'s Team",
                'slug' => $slug,
                'personal_team' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('team_user')->insert([
                'team_id' => $teamId,
                'user_id' => $user->id,
                'role' => 'owner',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('users')
                ->where('id', $user->id)
                ->update(['current_team_id' => $teamId]);

            foreach ($this->resourceTables as $tableName) {
                DB::table($tableName)
                    ->where('user_id', $user->id)
                    ->update(['team_id' => $teamId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->update(['current_team_id' => null]);

        foreach ($this->resourceTables as $tableName) {
            DB::table($tableName)->update(['team_id' => null]);
        }

        DB::table('team_user')->delete();
        DB::table('teams')->where('personal_team', true)->delete();
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $counter = 1;

        while (DB::table('teams')->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
};
