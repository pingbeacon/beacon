<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Services\AckHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AcknowledgeIncidentController extends Controller
{
    public function __construct(private readonly AckHandler $handler) {}

    public function __invoke(Request $request, Incident $incident): RedirectResponse
    {
        $result = $this->handler->ack($incident->ack_token ?? '', $request->user()->id);

        return redirect()->back()->with('ack_status', $result->status->value);
    }
}
