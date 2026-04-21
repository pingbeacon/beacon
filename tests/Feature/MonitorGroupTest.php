<?php

use App\Models\Monitor;
use App\Models\MonitorGroup;
use App\Models\User;

// --- Guest redirects ---

test('guests are redirected to login for monitor group store', function () {
    $this->post('/monitor-groups')->assertRedirect('/login');
});

// --- CRUD ---

test('user can create a monitor group', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitor-groups', [
            'name' => 'Production',
            'description' => 'Production servers',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(MonitorGroup::where('user_id', $user->id)->where('name', 'Production')->exists())->toBeTrue();
});

test('monitor group creation fails without name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/monitor-groups', [
            'description' => 'No name group',
        ])
        ->assertSessionHasErrors('name');
});

test('user can create a group with parent', function () {
    $user = User::factory()->create();
    $parent = MonitorGroup::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/monitor-groups', [
            'name' => 'Child Group',
            'parent_id' => $parent->id,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $child = MonitorGroup::where('name', 'Child Group')->first();
    expect($child->parent_id)->toBe($parent->id);
});

test('user cannot set parent_id to another users group', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherGroup = MonitorGroup::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/monitor-groups', [
            'name' => 'Sneaky Group',
            'parent_id' => $otherGroup->id,
        ])
        ->assertSessionHasErrors('parent_id');
});

test('user can update their own group', function () {
    $user = User::factory()->create();
    $group = MonitorGroup::factory()->for($user)->create(['name' => 'Old Name']);

    $this->actingAs($user)
        ->patch("/monitor-groups/{$group->id}", [
            'name' => 'New Name',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($group->fresh()->name)->toBe('New Name');
});

test('user cannot update another users group', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $group = MonitorGroup::factory()->for($other)->create();

    $this->actingAs($user)
        ->patch("/monitor-groups/{$group->id}", [
            'name' => 'Hacked',
        ])
        ->assertForbidden();
});

test('user can delete their own group', function () {
    $user = User::factory()->create();
    $group = MonitorGroup::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete("/monitor-groups/{$group->id}")
        ->assertRedirect();

    expect($group->fresh())->toBeNull();
});

test('user cannot delete another users group', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $group = MonitorGroup::factory()->for($other)->create();

    $this->actingAs($user)
        ->delete("/monitor-groups/{$group->id}")
        ->assertForbidden();

    expect($group->fresh())->not->toBeNull();
});

test('deleting a group ungroups its monitors', function () {
    $user = User::factory()->create();
    $group = MonitorGroup::factory()->for($user)->create();
    $monitor = Monitor::factory()->for($user)->create(['monitor_group_id' => $group->id]);

    $this->actingAs($user)
        ->delete("/monitor-groups/{$group->id}")
        ->assertRedirect();

    expect($monitor->fresh()->monitor_group_id)->toBeNull();
});

test('deleting a group unparents child groups', function () {
    $user = User::factory()->create();
    $parent = MonitorGroup::factory()->for($user)->create();
    $child = MonitorGroup::factory()->for($user)->create(['parent_id' => $parent->id]);

    $this->actingAs($user)
        ->delete("/monitor-groups/{$parent->id}")
        ->assertRedirect();

    expect($child->fresh()->parent_id)->toBeNull();
});

// --- Reorder ---

test('user can reorder groups and monitors', function () {
    $user = User::factory()->create();
    $groupA = MonitorGroup::factory()->for($user)->create(['sort_order' => 0]);
    $groupB = MonitorGroup::factory()->for($user)->create(['sort_order' => 1]);
    $monitor = Monitor::factory()->for($user)->create(['monitor_group_id' => null, 'sort_order' => 0]);

    $this->actingAs($user)
        ->post('/monitor-groups/reorder', [
            'groups' => [
                ['id' => $groupA->id, 'sort_order' => 1, 'parent_id' => null],
                ['id' => $groupB->id, 'sort_order' => 0, 'parent_id' => null],
            ],
            'monitors' => [
                ['id' => $monitor->id, 'sort_order' => 0, 'monitor_group_id' => $groupA->id],
            ],
        ])
        ->assertRedirect();

    expect($groupA->fresh()->sort_order)->toBe(1);
    expect($groupB->fresh()->sort_order)->toBe(0);
    expect($monitor->fresh()->monitor_group_id)->toBe($groupA->id);
});

test('user cannot reorder another users groups', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $group = MonitorGroup::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/monitor-groups/reorder', [
            'groups' => [
                ['id' => $group->id, 'sort_order' => 5, 'parent_id' => null],
            ],
        ])
        ->assertSessionHasErrors('groups.0.id');
});

// --- Monitor group assignment ---

test('user can assign a monitor to a group during creation', function () {
    $user = User::factory()->create();
    $group = MonitorGroup::factory()->for($user)->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Grouped Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
            'interval' => 60,
            'timeout' => 30,
            'retry_count' => 0,
            'monitor_group_id' => $group->id,
        ])
        ->assertSessionHasNoErrors();

    $monitor = Monitor::where('user_id', $user->id)->where('name', 'Grouped Monitor')->first();
    expect($monitor->monitor_group_id)->toBe($group->id);
});

test('user cannot assign monitor to another users group', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherGroup = MonitorGroup::factory()->for($other)->create();

    $this->actingAs($user)
        ->post('/monitors', [
            'name' => 'Monitor',
            'type' => 'http',
            'url' => 'https://example.com',
            'monitor_group_id' => $otherGroup->id,
        ])
        ->assertSessionHasErrors('monitor_group_id');
});

// --- Index includes groups ---

test('monitors index includes groups', function () {
    $user = User::factory()->create();
    MonitorGroup::factory()->for($user)->create(['name' => 'Test Group']);

    $this->actingAs($user)
        ->get('/monitors')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('monitors/index')
            ->has('groups', 1)
        );
});
