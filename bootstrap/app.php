<?php

use App\Http\Middleware\EnsureApiTokenTeamContext;
use App\Http\Middleware\EnsureTeamContext;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HandleTheme;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Uncomment this when you have sidebar state
        // $middleware->encryptCookies(except: ['sidebar:state']);

        $middleware->web(append: [
            HandleTheme::class,
            HandleInertiaRequests::class,
            EnsureTeamContext::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'api.team' => EnsureApiTokenTeamContext::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'code' => 'unauthenticated',
                ], 401);
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'message' => 'This action is unauthorized.',
                    'code' => 'unauthorized',
                ], 403);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'message' => 'Not found.',
                    'code' => 'not_found',
                ], 404);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                    'code' => 'validation_error',
                ], 422);
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return response()->json([
                    'message' => 'Too many requests.',
                    'code' => 'too_many_requests',
                ], 429)->withHeaders([
                    'Retry-After' => $e->getHeaders()['Retry-After'] ?? 60,
                ]);
            }
        });
    })->create();
