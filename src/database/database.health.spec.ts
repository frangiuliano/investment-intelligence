import { DatabaseHealth } from './database.health';

describe('DatabaseHealth', () => {
  it('should return false when DataSource is not initialized and initialize fails', async () => {
    const dataSource = {
      isInitialized: false,
      initialize: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      query: jest.fn(),
    };

    const health = new DatabaseHealth(dataSource as never);

    await expect(health.isUp()).resolves.toBe(false);
    expect(dataSource.initialize).toHaveBeenCalled();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('should return true when query succeeds', async () => {
    const dataSource = {
      isInitialized: true,
      initialize: jest.fn(),
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const health = new DatabaseHealth(dataSource as never);

    await expect(health.isUp()).resolves.toBe(true);
    expect(dataSource.initialize).not.toHaveBeenCalled();
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
