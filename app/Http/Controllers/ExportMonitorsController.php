<?php

namespace App\Http\Controllers;

use App\Actions\ExportMonitorsAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExportMonitorsController extends Controller
{
    public function __invoke(Request $request, ExportMonitorsAction $action): JsonResponse
    {
        $ids = $request->input('ids');
        $data = $action->execute($request->user(), $ids);

        return response()->json($data)
            ->header('Content-Disposition', 'attachment; filename="monitors-export.json"');
    }
}
