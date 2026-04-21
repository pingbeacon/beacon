<?php

return [

    'testing' => [
        'ensure_pages_exist' => true,
        'page_paths' => [
            resource_path('js/pages'),
        ],
        'page_extensions' => [
            'jsx',
            'tsx',
            'vue',
            'js',
            'ts',
        ],
    ],

    'history' => [
        'encrypt' => false,
    ],

    'ssr' => [
        'enabled' => false,
        'url' => 'http://127.0.0.1:13714',
    ],

];
