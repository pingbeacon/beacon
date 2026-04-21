# Stage 1a: Install PHP dependencies (prod only)
FROM composer:2 AS composer-builder
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction
COPY . .
RUN composer dump-autoload --optimize --no-dev

# Stage 1b: Install PHP dependencies (with dev, for testing)
FROM composer:2 AS composer-builder-dev
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction
COPY . .
RUN composer dump-autoload --optimize

# Stage 2: Build frontend assets (needs PHP for wayfinder:generate)
FROM php:8.4-cli-alpine AS node-builder
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY --from=composer-builder /app/vendor ./vendor
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime image
FROM php:8.4-fpm-alpine AS runtime

# System dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    postgresql-client \
    postgresql-dev \
    curl \
    bash \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    linux-headers \
    autoconf \
    build-base \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        pgsql \
        bcmath \
        intl \
        mbstring \
        pcntl \
        opcache \
        sockets \
        zip \
        gd \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del --no-cache build-base

# Opcache config
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=20000'; \
    echo 'opcache.revalidate_freq=0'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.save_comments=1'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# Non-root user; add nginx to www group so it can access php-fpm socket
RUN addgroup -g 1000 -S www && adduser -u 1000 -S www -G www \
    && addgroup nginx www

WORKDIR /var/www/html

# Copy dependencies from builder stages
COPY --from=composer-builder /app/vendor ./vendor
COPY --from=node-builder /app/public/build ./public/build

# Copy application source
COPY --chown=www:www . .

# Copy Docker config files
COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/zz-www.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www:www storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

ENV APP_ENV=production

EXPOSE 80 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]

# Test stage: same runtime but with dev dependencies (Pest/PHPUnit available)
FROM runtime AS test
COPY --from=composer-builder-dev --chown=www:www /app/vendor ./vendor
