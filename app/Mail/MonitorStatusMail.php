<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MonitorStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $monitorName,
        public readonly string $status,
        public readonly string $body,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[UptimeRadar] {$this->monitorName} is {$this->status}",
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.monitor-status',
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
