#!/bin/bash
set -e

if [ "$1" = "php-fpm" ]; then
    echo "[entrypoint] Discovering packages..."
    php artisan package:discover --ansi

    echo "[entrypoint] Caching config, routes, views, events..."
    php artisan optimize

    echo "[entrypoint] Running migrations..."
    php artisan migrate --force

    echo "[entrypoint] Starting supervisord..."
    exec /usr/bin/supervisord -c /etc/supervisord.conf
else
    if [ "${DB_CONNECTION:-pgsql}" != "sqlite" ] && [ "${APP_ENV:-production}" != "testing" ]; then
        echo "[entrypoint] Waiting for database at ${DB_HOST:-postgres}:${DB_PORT:-5432}..."
        until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-beacon}" > /dev/null 2>&1; do
            sleep 2
        done
        echo "[entrypoint] Database ready."
    fi
    exec "$@"
fi
