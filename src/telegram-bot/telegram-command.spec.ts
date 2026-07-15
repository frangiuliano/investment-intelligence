import { parseTelegramCommand } from './telegram-command';

describe('parseTelegramCommand', () => {
  it('parses /brief with ticker and bot suffix', () => {
    expect(parseTelegramCommand('/brief AAPL')).toEqual({
      type: 'brief',
      symbol: 'AAPL',
    });
    expect(parseTelegramCommand('/brief@FinanceBot MSFT')).toEqual({
      type: 'brief',
      symbol: 'MSFT',
    });
  });

  it('parses help and start', () => {
    expect(parseTelegramCommand('/help')).toEqual({ type: 'help' });
    expect(parseTelegramCommand('/start')).toEqual({ type: 'help' });
  });

  it('returns unknown for non-commands', () => {
    expect(parseTelegramCommand('hello')).toEqual({
      type: 'unknown',
      raw: 'hello',
    });
  });
});
