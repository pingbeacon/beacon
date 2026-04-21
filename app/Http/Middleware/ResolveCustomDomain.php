<?php

namespace App\Http\Middleware;

use App\Http\Controllers\PublicStatusPageController;
use App\Models\StatusPage;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveCustomDomain
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = $request->getHost();

        $statusPage = StatusPage::query()
            ->where('custom_domain', $host)
            ->where('is_published', true)
            ->first();

        if ($statusPage) {
            return app(PublicStatusPageController::class)->__invoke($request, $statusPage);
        }

        return $next($request);
    }
}
