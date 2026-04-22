<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=jetbrains-mono:400,500,600,700&display=swap" rel="stylesheet" />

        <!-- Runtime config (injected server-side so env vars don't need to be baked into the bundle) -->
        <script>
            window.__reverb__ = {
                key: "{{ config('broadcasting.connections.reverb.key') }}",
                host: "{{ config('broadcasting.connections.reverb.options.host') }}",
                port: {{ config('broadcasting.connections.reverb.options.port', 443) }},
                scheme: "{{ config('broadcasting.connections.reverb.options.scheme', 'https') }}",
            };
        </script>

        <!-- Scripts -->
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
