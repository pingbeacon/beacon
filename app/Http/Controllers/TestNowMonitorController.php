<?php

namespace App\Http\Controllers;

use App\Http\Requests\TestNowMonitorRequest;
use App\Services\TestNowRunner;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;

class TestNowMonitorController extends Controller
{
    public function __invoke(TestNowMonitorRequest $request, TestNowRunner $runner): JsonResponse
    {
        try {
            $result = $runner->run($request->validated());
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['result' => $result->toArray()]);
    }
}
