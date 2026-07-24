import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import {
  Hypothesis,
  HypothesisBias,
  HypothesisSource,
  HypothesisStatus,
} from './entities/hypothesis.entity';
import { HypothesesService } from './hypotheses.service';

describe('HypothesesService', () => {
  let service: HypothesesService;
  let findOne: jest.Mock;
  let find: jest.Mock;
  let create: jest.Mock;
  let save: jest.Mock;
  let update: jest.Mock;

  const sampleHypothesis: Hypothesis = {
    id: '11111111-1111-4111-8111-111111111111',
    symbol: 'AAPL',
    bias: HypothesisBias.BULLISH,
    thesis: 'Services growth supports margins.',
    invalidation: 'Services growth falls below 5%.',
    horizonDays: 90,
    status: HypothesisStatus.OPEN,
    source: HypothesisSource.MANUAL,
    sourceRefId: null,
    closedAt: null,
    closeNote: null,
    createdAt: new Date('2026-07-15T12:00:00.000Z'),
    updatedAt: new Date('2026-07-15T12:00:00.000Z'),
  };

  beforeEach(async () => {
    findOne = jest.fn();
    find = jest.fn();
    create = jest.fn((entity: unknown) => entity);
    save = jest.fn((entity: Partial<Hypothesis>) =>
      Promise.resolve({ ...sampleHypothesis, ...entity }),
    );
    update = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HypothesesService,
        {
          provide: getRepositoryToken(Hypothesis),
          useValue: { findOne, find, create, save, update },
        },
      ],
    }).compile();

    service = module.get(HypothesesService);
  });

  it('should create an open manual hypothesis with normalized fields', async () => {
    const hypothesis = await service.create({
      symbol: ' aapl ',
      bias: 'bullish',
      thesis: '  Services growth supports margins. ',
      invalidation: ' Services growth falls below 5%. ',
      horizonDays: 90,
    });

    expect(create).toHaveBeenCalledWith({
      symbol: 'AAPL',
      bias: HypothesisBias.BULLISH,
      thesis: 'Services growth supports margins.',
      invalidation: 'Services growth falls below 5%.',
      horizonDays: 90,
      status: HypothesisStatus.OPEN,
      source: HypothesisSource.MANUAL,
      sourceRefId: null,
      closedAt: null,
      closeNote: null,
    });
    expect(hypothesis.status).toBe(HypothesisStatus.OPEN);
  });

  it('should default horizonDays to 30 when omitted', async () => {
    await service.create({
      symbol: 'AAPL',
      bias: 'watch',
      thesis: 'Wait for catalyst.',
      invalidation: 'Break of range without news.',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ horizonDays: 30 }),
    );
  });

  it('should list open hypotheses by default', async () => {
    find.mockResolvedValue([sampleHypothesis]);

    await expect(service.findAll()).resolves.toEqual([sampleHypothesis]);
    expect(find).toHaveBeenCalledWith({
      where: { status: HypothesisStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
  });

  it('should filter by source when provided', async () => {
    find.mockResolvedValue([sampleHypothesis]);

    await expect(service.findAll('open', 'brief')).resolves.toEqual([
      sampleHypothesis,
    ]);
    expect(find).toHaveBeenCalledWith({
      where: {
        status: HypothesisStatus.OPEN,
        source: HypothesisSource.BRIEF,
      },
      order: { createdAt: 'DESC' },
    });
  });

  it('should look up by sourceRefId without forcing status', async () => {
    const briefId = '22222222-2222-4222-8222-222222222222';
    find.mockResolvedValue([sampleHypothesis]);

    await expect(service.findAll(undefined, 'brief', briefId)).resolves.toEqual(
      [sampleHypothesis],
    );
    expect(find).toHaveBeenCalledWith({
      where: {
        source: HypothesisSource.BRIEF,
        sourceRefId: briefId,
      },
      order: { createdAt: 'DESC' },
    });
  });

  it('should reject invalid bias and horizon values', async () => {
    const input = {
      symbol: 'AAPL',
      bias: 'buy',
      thesis: 'Thesis',
      invalidation: 'Invalidation',
      horizonDays: 0,
    };

    await expect(service.create(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create({ ...input, bias: 'watch' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should close an open hypothesis with an optional note', async () => {
    const closedHypothesis = {
      ...sampleHypothesis,
      status: HypothesisStatus.CLOSED,
      closedAt: new Date('2026-07-15T13:00:00.000Z'),
      closeNote: 'Evidence changed.',
    };
    update.mockResolvedValue({ affected: 1 });
    findOne.mockResolvedValue(closedHypothesis);

    await expect(
      service.close(sampleHypothesis.id, {
        closeNote: ' Evidence changed. ',
      }),
    ).resolves.toEqual(closedHypothesis);
    const [criteria, changes] = update.mock.calls[0] as [
      { id: string; status: HypothesisStatus },
      Partial<Hypothesis>,
    ];
    expect(criteria).toEqual({
      id: sampleHypothesis.id,
      status: HypothesisStatus.OPEN,
    });
    expect(changes.status).toBe(HypothesisStatus.CLOSED);
    expect(changes.closedAt).toBeInstanceOf(Date);
    expect(changes.closeNote).toBe('Evidence changed.');
  });

  it('should close an open hypothesis without a request body', async () => {
    const closedHypothesis = {
      ...sampleHypothesis,
      status: HypothesisStatus.CLOSED,
      closedAt: new Date('2026-07-15T13:00:00.000Z'),
      closeNote: null,
    };
    update.mockResolvedValue({ affected: 1 });
    findOne.mockResolvedValue(closedHypothesis);

    await expect(
      service.close(sampleHypothesis.id, undefined),
    ).resolves.toEqual(closedHypothesis);
    const [, changes] = update.mock.calls[0] as [
      { id: string; status: HypothesisStatus },
      Partial<Hypothesis>,
    ];
    expect(changes.closeNote).toBeNull();
  });

  it('should reject closing an already closed hypothesis', async () => {
    update.mockResolvedValue({ affected: 0 });
    findOne.mockResolvedValue({
      ...sampleHypothesis,
      status: HypothesisStatus.CLOSED,
    });

    await expect(service.close(sampleHypothesis.id, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should throw NotFoundException when closing a missing hypothesis', async () => {
    update.mockResolvedValue({ affected: 0 });
    findOne.mockResolvedValue(null);

    await expect(service.close(sampleHypothesis.id, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('createFromBrief', () => {
    const briefId = '22222222-2222-4222-8222-222222222222';

    it('creates an open brief-sourced hypothesis with mapped bias and default horizon', async () => {
      findOne.mockResolvedValue(null);

      const hypothesis = await service.createFromBrief({
        briefId,
        symbol: 'aapl',
        stance: 'enter',
        thesis: 'Uptrend on verified closes',
        invalidation: 'Break of support',
      });

      expect(create).toHaveBeenCalledWith({
        symbol: 'AAPL',
        bias: HypothesisBias.BULLISH,
        thesis: 'Uptrend on verified closes',
        invalidation: 'Break of support',
        horizonDays: 30,
        status: HypothesisStatus.OPEN,
        source: HypothesisSource.BRIEF,
        sourceRefId: briefId,
        closedAt: null,
        closeNote: null,
      });
      expect(hypothesis?.source).toBe(HypothesisSource.BRIEF);
      expect(hypothesis?.sourceRefId).toBe(briefId);
    });

    it('returns the existing hypothesis when one is already linked to the brief', async () => {
      const existing = {
        ...sampleHypothesis,
        source: HypothesisSource.BRIEF,
        sourceRefId: briefId,
      };
      findOne.mockResolvedValue(existing);

      await expect(
        service.createFromBrief({
          briefId,
          symbol: 'AAPL',
          stance: 'enter',
          thesis: 'Uptrend',
          invalidation: 'Break',
        }),
      ).resolves.toEqual(existing);
      expect(save).not.toHaveBeenCalled();
    });

    it('is idempotent when a unique violation races another insert', async () => {
      const existing = {
        ...sampleHypothesis,
        source: HypothesisSource.BRIEF,
        sourceRefId: briefId,
      };
      findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      save.mockRejectedValueOnce(
        new QueryFailedError('INSERT', [], { code: '23505' }),
      );

      await expect(
        service.createFromBrief({
          briefId,
          symbol: 'AAPL',
          stance: 'hold',
          thesis: 'Hold thesis',
          invalidation: 'Exit trigger',
        }),
      ).resolves.toEqual(existing);
    });

    it('skips unknown stance values without creating', async () => {
      await expect(
        service.createFromBrief({
          briefId,
          symbol: 'AAPL',
          stance: 'buy',
          thesis: 'Thesis',
          invalidation: 'Invalidation',
        }),
      ).resolves.toBeNull();
      expect(save).not.toHaveBeenCalled();
    });
  });
});
