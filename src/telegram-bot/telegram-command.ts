export type TelegramChat = {
  id: number | string;
};

export type TelegramUser = {
  id: number | string;
};

export type TelegramMessage = {
  message_id?: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

export type ParsedTelegramCommand =
  | { type: 'brief'; symbol: string }
  | { type: 'review'; month?: string }
  | { type: 'help' }
  | { type: 'unknown'; raw: string }
  | { type: 'empty' };

export function parseTelegramCommand(
  text: string | undefined,
): ParsedTelegramCommand {
  if (!text || text.trim().length === 0) {
    return { type: 'empty' };
  }

  const trimmed = text.trim();
  const match = trimmed.match(
    /^\/([a-zA-Z_]+)(?:@[A-Za-z0-9_]+)?(?:\s+(.*))?$/,
  );
  if (!match) {
    return { type: 'unknown', raw: trimmed };
  }

  const command = match[1].toLowerCase();
  const args = (match[2] ?? '').trim();

  if (command === 'brief') {
    const symbol = args.split(/\s+/)[0] ?? '';
    return { type: 'brief', symbol };
  }

  if (command === 'review') {
    const month = args.split(/\s+/)[0] ?? '';
    return month ? { type: 'review', month } : { type: 'review' };
  }

  if (command === 'help' || command === 'start') {
    return { type: 'help' };
  }

  return { type: 'unknown', raw: trimmed };
}

/** Telegram private chats use positive ids; groups/supergroups use negative. */
export function isPrivateTelegramChatId(chatId: number | string): boolean {
  const numeric = typeof chatId === 'number' ? chatId : Number(chatId);
  return Number.isFinite(numeric) && numeric > 0;
}
