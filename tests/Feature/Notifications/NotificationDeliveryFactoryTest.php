<?php

use App\Models\NotificationDelivery;

it('default factory state generates tenant-consistent rows', function () {
    $delivery = NotificationDelivery::factory()->create();

    expect($delivery->channel->team_id)->toBe($delivery->team_id);
    expect($delivery->monitor->team_id)->toBe($delivery->team_id);
});
