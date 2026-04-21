<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $team = $request->user()->currentTeam;

        $query = AuditLog::query()
            ->where('team_id', $team->id)
            ->with('user')
            ->latest('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('auditable_type')) {
            $query->where('auditable_type', $request->input('auditable_type'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->input('to'));
        }

        $logs = $query->paginate(25)->withQueryString();

        return inertia('settings/audit-log/index', [
            'logs' => $logs,
            'filters' => $request->only(['action', 'auditable_type', 'user_id', 'from', 'to']),
        ]);
    }
}
