<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Database\Factories\StatusPageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class StatusPage extends Model
{
    /** @use HasFactory<StatusPageFactory> */
    use Auditable, HasFactory;

    protected static array $auditExclude = [];

    protected $fillable = [
        'team_id',
        'user_id',
        'title',
        'slug',
        'description',
        'is_published',
        'logo_path',
        'favicon_path',
        'primary_color',
        'background_color',
        'text_color',
        'custom_css',
        'header_text',
        'footer_text',
        'custom_domain',
        'show_powered_by',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'show_powered_by' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function monitors(): BelongsToMany
    {
        return $this->belongsToMany(Monitor::class, 'status_page_monitor')->withPivot('sort_order')->orderByPivot('sort_order');
    }
}
