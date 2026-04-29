<?php

use Symfony\Component\Finder\Finder;

/**
 * Foundation token rename sweep — issue #16.
 *
 * Acceptance: no reference to old token names (--bg, --fg, --danger, --primary-fg,
 * --primary-subtle, *-fg) remains anywhere in resources/js or resources/css.
 */
function sweepFiles(): array
{
    $base = base_path('resources');
    $files = [];

    foreach ((new Finder)->in($base)->files()->name(['*.tsx', '*.ts', '*.jsx', '*.js', '*.css']) as $file) {
        $files[$file->getRealPath()] = file_get_contents($file->getRealPath());
    }

    return $files;
}

function findOffenders(array $files, string $pattern): array
{
    $hits = [];
    foreach ($files as $path => $content) {
        if (preg_match_all($pattern, $content, $m, PREG_OFFSET_CAPTURE)) {
            foreach ($m[0] as [$match, $offset]) {
                $line = substr_count(substr($content, 0, $offset), "\n") + 1;
                $hits[] = "{$path}:{$line}: {$match}";
            }
        }
    }

    return $hits;
}

it('does not reference old design tokens as CSS variables', function () {
    $files = sweepFiles();

    $patterns = [
        'var(--bg)' => '/var\(--bg\)/',
        'var(--fg)' => '/var\(--fg\)/',
        'var(--danger)' => '/var\(--danger\)/',
        'var(--primary-fg)' => '/var\(--primary-fg\)/',
        'var(--primary-subtle)' => '/var\(--primary-subtle\)/',
        'var(--success-subtle)' => '/var\(--success-subtle\)/',
        'var(--danger-subtle)' => '/var\(--danger-subtle\)/',
        'var(--warning-subtle)' => '/var\(--warning-subtle\)/',
        'var(--info-subtle)' => '/var\(--info-subtle\)/',
        'var(--overlay)' => '/var\(--overlay\)/',
        'var(--navbar)' => '/var\(--navbar\)/',
    ];

    foreach ($patterns as $label => $pattern) {
        $hits = findOffenders($files, $pattern);
        expect($hits)->toBeEmpty(
            "Found legacy token reference {$label}:\n".implode("\n", $hits)
        );
    }
});

it('does not reference old *-fg suffixed names anywhere', function () {
    $files = sweepFiles();

    // any token or class name ending in -fg followed by word/non-word boundary,
    // excluding contexts where -fg is part of a longer identifier (none should remain).
    $hits = findOffenders($files, '/(?<![\w-])(--[a-z][a-z0-9-]*-fg|[a-z]+-[a-z]+-fg|[a-z]+-fg)(?![\w-])/');

    // tag-class names like ".eyebrow" naturally don't match. confirm no hits.
    expect($hits)->toBeEmpty(
        "Found legacy *-fg token/class:\n".implode("\n", $hits)
    );
});

it('app.css declares the canonical shadcn tokens', function () {
    $css = file_get_contents(base_path('resources/css/app.css'));

    foreach ([
        '--background',
        '--foreground',
        '--primary',
        '--primary-foreground',
        '--destructive',
        '--destructive-foreground',
        '--success',
        '--warning',
        '--panel-hi',
        '--surface',
        '--border-strong',
        '--dim',
        '--faint',
    ] as $token) {
        expect($css)->toContain($token);
    }
});

it('app.css ships the bundle component utility classes', function () {
    $css = file_get_contents(base_path('resources/css/app.css'));

    foreach ([
        '.eyebrow',
        '.pill-up',
        '.pill-degraded',
        '.pill-down',
        '.pill-resolved',
        '.status-dot-up',
        '.status-dot-degraded',
        '.status-dot-down',
        '.tag',
        '.terminal',
        '.kpi-label',
        '.kpi-value',
        '.kpi-sub',
        '.heartbeat-bar-up',
        '.heartbeat-bar-degraded',
        '.heartbeat-bar-down',
        '.grid-bg',
        'touch-hitbox',
        'shadow-product',
        'ring-hairline',
    ] as $selector) {
        expect($css)->toContain($selector);
    }
});

it('app.css uses the @custom-variant dark directive', function () {
    $css = file_get_contents(base_path('resources/css/app.css'));

    expect($css)->toContain('@custom-variant dark');
    expect($css)->not->toMatch('/@variant\s+dark\s*\(/');
});

it('the root html template ships the dark class so shadcn picks up the theme', function () {
    $html = file_get_contents(base_path('resources/views/app.blade.php'));

    // blade interpolates `app()->getLocale()` inside <html …>, so don't try to regex it.
    // checking that the opening <html …> tag carries class="dark" is sufficient.
    expect($html)->toContain('class="dark"');
    expect($html)->toMatch('/<html[\s\S]*?class="dark"[\s\S]*?>/');
});
