<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssertionRequest;
use App\Http\Requests\UpdateAssertionRequest;
use App\Models\Assertion;
use App\Models\Monitor;
use Illuminate\Http\RedirectResponse;

class AssertionController extends Controller
{
    public function store(StoreAssertionRequest $request, Monitor $monitor): RedirectResponse
    {
        $monitor->assertions()->create($request->validated());

        return redirect()
            ->route('monitors.show', ['monitor' => $monitor, 'tab' => 'assertions'])
            ->with('success', 'Assertion created.');
    }

    public function update(UpdateAssertionRequest $request, Monitor $monitor, Assertion $assertion): RedirectResponse
    {
        abort_unless($assertion->monitor_id === $monitor->id, 404);

        $assertion->update($request->validated());

        return redirect()
            ->route('monitors.show', ['monitor' => $monitor, 'tab' => 'assertions'])
            ->with('success', 'Assertion updated.');
    }

    public function destroy(Monitor $monitor, Assertion $assertion): RedirectResponse
    {
        $this->authorize('update', $monitor);
        abort_unless($assertion->monitor_id === $monitor->id, 404);

        $assertion->delete();

        return redirect()
            ->route('monitors.show', ['monitor' => $monitor, 'tab' => 'assertions'])
            ->with('success', 'Assertion deleted.');
    }
}
