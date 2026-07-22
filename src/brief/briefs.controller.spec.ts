import { BriefService } from './brief.service';
import { BriefsController } from './briefs.controller';
import { BriefsQueryService } from './briefs-query.service';

describe('BriefsController', () => {
  const briefsQueryService = {
    findBriefs: jest.fn(),
    findBrief: jest.fn(),
    findBriefChartPng: jest.fn(),
  };

  const briefService = {
    requestBriefOrThrow: jest.fn(),
  };

  const controller = new BriefsController(
    briefsQueryService as unknown as BriefsQueryService,
    briefService as unknown as BriefService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists briefs with parsed query params', async () => {
    briefsQueryService.findBriefs.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.list('1', '20', 'AAPL');

    expect(briefsQueryService.findBriefs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      ticker: 'AAPL',
    });
  });

  it('lists briefs without filters', async () => {
    briefsQueryService.findBriefs.mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
    });

    await controller.list();

    expect(briefsQueryService.findBriefs).toHaveBeenCalledWith({
      page: undefined,
      limit: undefined,
      ticker: undefined,
    });
  });

  it('returns brief detail', async () => {
    briefsQueryService.findBrief.mockResolvedValue({
      id: 'b1',
      chartAvailable: false,
    });

    await expect(controller.detail('b1')).resolves.toEqual({
      id: 'b1',
      chartAvailable: false,
    });
    expect(briefsQueryService.findBrief).toHaveBeenCalledWith('b1');
  });

  it('returns the chart as a StreamableFile', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    briefsQueryService.findBriefChartPng.mockResolvedValue(png);

    const file = await controller.chart('11111111-1111-1111-1111-111111111111');

    expect(briefsQueryService.findBriefChartPng).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(file.getHeaders()).toEqual(
      expect.objectContaining({
        type: 'image/png',
      }),
    );
  });

  it('requests a brief via the shared pipeline', async () => {
    briefService.requestBriefOrThrow.mockResolvedValue({
      id: 'b1',
      symbol: 'AAPL',
    });

    await expect(controller.request({ ticker: 'aapl' })).resolves.toEqual({
      id: 'b1',
      symbol: 'AAPL',
    });
    expect(briefService.requestBriefOrThrow).toHaveBeenCalledWith('aapl');
  });

  it('passes empty ticker when body omits it', async () => {
    briefService.requestBriefOrThrow.mockRejectedValue(new Error('required'));

    await expect(controller.request({})).rejects.toThrow('required');
    expect(briefService.requestBriefOrThrow).toHaveBeenCalledWith('');
  });
});
