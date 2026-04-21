<?php

use App\Actions\ExportMonitorsAction;
use App\Actions\ImportMonitorsAction;
use App\Models\Monitor;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Http\UploadedFile;

// --- Export ---

test('export returns valid schema', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->for($user)->create();
    $monitor = Monitor::factory()->http()->for($user)->create();
    $monitor->tags()->sync([$tag->id]);

    $action = new ExportMonitorsAction;
    $data = $action->execute($user);

    expect($data)->toHaveKeys(['version', 'exported_at', 'monitors', 'groups']);
    expect($data['version'])->toBe(1);
    expect($data['monitors'])->toHaveCount(1);
    expect($data['monitors'][0])->toHaveKeys(['name', 'type', 'url', 'tags']);
    expect($data['monitors'][0]['tags'])->toHaveCount(1);
});

test('export is user scoped', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Monitor::factory()->http()->for($user)->create(['name' => 'Mine']);
    Monitor::factory()->http()->for($other)->create(['name' => 'Not Mine']);

    $action = new ExportMonitorsAction;
    $data = $action->execute($user);

    expect($data['monitors'])->toHaveCount(1);
    expect($data['monitors'][0]['name'])->toBe('Mine');
});

test('selective export only includes specified monitors', function () {
    $user = User::factory()->create();
    $m1 = Monitor::factory()->http()->for($user)->create(['name' => 'First']);
    $m2 = Monitor::factory()->http()->for($user)->create(['name' => 'Second']);
    Monitor::factory()->http()->for($user)->create(['name' => 'Third']);

    $action = new ExportMonitorsAction;
    $data = $action->execute($user, [$m1->id, $m2->id]);

    expect($data['monitors'])->toHaveCount(2);
});

test('export endpoint returns json download', function () {
    $user = User::factory()->create();
    Monitor::factory()->http()->for($user)->create();

    $this->actingAs($user)
        ->get('/monitors/export')
        ->assertOk()
        ->assertJsonStructure(['version', 'exported_at', 'monitors', 'groups']);
});

// --- Import ---

test('import creates monitors and groups', function () {
    $user = User::factory()->create();

    $data = [
        'version' => 1,
        'exported_at' => now()->toISOString(),
        'groups' => [
            ['name' => 'Production', 'description' => 'Prod servers', 'sort_order' => 0],
        ],
        'monitors' => [
            [
                'name' => 'API Server',
                'type' => 'http',
                'url' => 'https://api.example.com',
                'method' => 'GET',
                'interval' => 60,
                'timeout' => 30,
                'retry_count' => 3,
                'group_name' => 'Production',
                'tags' => [
                    ['name' => 'API', 'color' => '#FF0000'],
                ],
            ],
        ],
    ];

    $action = new ImportMonitorsAction;
    $result = $action->execute($user, $data);

    expect($result->monitorsCreated)->toBe(1);
    expect($result->groupsCreated)->toBe(1);
    expect($result->tagsCreated)->toBe(1);
    expect($result->errors)->toBeEmpty();

    $monitor = Monitor::where('user_id', $user->id)->where('name', 'API Server')->first();
    expect($monitor)->not->toBeNull();
    expect($monitor->monitorGroup)->not->toBeNull();
    expect($monitor->monitorGroup->name)->toBe('Production');
    expect($monitor->tags)->toHaveCount(1);
});

test('import reuses existing tags', function () {
    $user = User::factory()->create();
    Tag::factory()->for($user)->create(['name' => 'API', 'color' => '#FF0000']);

    $data = [
        'version' => 1,
        'monitors' => [
            [
                'name' => 'My Monitor',
                'type' => 'http',
                'url' => 'https://example.com',
                'tags' => [
                    ['name' => 'API', 'color' => '#FF0000'],
                ],
            ],
        ],
    ];

    $action = new ImportMonitorsAction;
    $result = $action->execute($user, $data);

    expect($result->tagsCreated)->toBe(0);
    expect(Tag::where('user_id', $user->id)->where('name', 'API')->count())->toBe(1);
});

test('import does not import notification channels', function () {
    $user = User::factory()->create();

    $data = [
        'version' => 1,
        'monitors' => [
            [
                'name' => 'Monitor',
                'type' => 'http',
                'url' => 'https://example.com',
            ],
        ],
    ];

    $action = new ImportMonitorsAction;
    $result = $action->execute($user, $data);

    $monitor = Monitor::where('user_id', $user->id)->where('name', 'Monitor')->first();
    expect($monitor->notificationChannels)->toHaveCount(0);
});

test('import rejects invalid schema', function () {
    $user = User::factory()->create();

    $action = new ImportMonitorsAction;
    $result = $action->execute($user, ['invalid' => 'data']);

    expect($result->errors)->not->toBeEmpty();
    expect($result->monitorsCreated)->toBe(0);
});

test('import result counts are correct', function () {
    $user = User::factory()->create();

    $data = [
        'version' => 1,
        'groups' => [
            ['name' => 'Group A'],
            ['name' => 'Group B'],
        ],
        'monitors' => [
            ['name' => 'Mon1', 'type' => 'http', 'url' => 'https://a.com', 'group_name' => 'Group A'],
            ['name' => 'Mon2', 'type' => 'http', 'url' => 'https://b.com', 'group_name' => 'Group B'],
            ['name' => 'Mon3', 'type' => 'ping', 'host' => 'c.com'],
        ],
    ];

    $action = new ImportMonitorsAction;
    $result = $action->execute($user, $data);

    expect($result->monitorsCreated)->toBe(3);
    expect($result->groupsCreated)->toBe(2);
});

test('import endpoint accepts json file', function () {
    $user = User::factory()->create();

    $data = json_encode([
        'version' => 1,
        'monitors' => [
            ['name' => 'Imported', 'type' => 'http', 'url' => 'https://example.com'],
        ],
    ]);

    $file = UploadedFile::fake()->createWithContent('monitors.json', $data);

    $this->actingAs($user)
        ->post('/monitors/import', ['file' => $file])
        ->assertRedirect('/monitors');

    expect(Monitor::where('user_id', $user->id)->where('name', 'Imported')->exists())->toBeTrue();
});

test('import endpoint rejects non-json files', function () {
    $user = User::factory()->create();

    $file = UploadedFile::fake()->create('monitors.txt', 100);

    $this->actingAs($user)
        ->post('/monitors/import', ['file' => $file])
        ->assertSessionHasErrors('file');
});
