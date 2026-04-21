<?php

namespace App\Http\Controllers;

use App\Actions\ImportMonitorsAction;
use App\Http\Requests\ImportMonitorsRequest;
use Illuminate\Http\RedirectResponse;

class ImportMonitorsController extends Controller
{
    public function __invoke(ImportMonitorsRequest $request, ImportMonitorsAction $action): RedirectResponse
    {
        $file = $request->file('file');
        $data = json_decode($file->getContent(), true);

        if (! is_array($data)) {
            flash(__('Invalid JSON file.'));

            return back();
        }

        $result = $action->execute($request->user(), $data);

        $message = __(':monitors monitors, :groups groups, :tags tags imported.', [
            'monitors' => $result->monitorsCreated,
            'groups' => $result->groupsCreated,
            'tags' => $result->tagsCreated,
        ]);

        if (count($result->errors) > 0) {
            $message .= ' '.__(':count error(s) occurred.', ['count' => count($result->errors)]);
        }

        flash($message);

        return to_route('monitors.index');
    }
}
