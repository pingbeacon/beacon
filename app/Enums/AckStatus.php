<?php

namespace App\Enums;

enum AckStatus: string
{
    case Acked = 'acked';
    case AlreadyAcked = 'already_acked';
    case Resolved = 'resolved';
    case InvalidToken = 'invalid_token';
}
