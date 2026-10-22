import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { matchExactChipIntent } from './chipIntents';
import { matchPipelineHealthIntent } from './pipelineHealthAsk';

describe('matchPipelineHealthIntent', () => {
  it('matches stalled pipeline (including typo phrasing)', () => {
    const intent = matchPipelineHealthIntent('Show my Stalled Pipeline', UserRole.SALES);
    expect(intent?.metric).toBe('pipeline_health');
    expect(intent?.filters?.detailSlice).toBe('stalled');
  });

  it('matches ageing / aging / aeging pipeline', () => {
    expect(
      matchPipelineHealthIntent('Show my Ageing Pipeline', UserRole.MANAGEMENT)?.filters
        ?.detailSlice,
    ).toBe('ageing');
    expect(
      matchPipelineHealthIntent('Show my Aging Pipeline', UserRole.ADMIN)?.filters?.detailSlice,
    ).toBe('ageing');
    expect(
      matchPipelineHealthIntent('Show my Aeging Pipeline', UserRole.SALES)?.filters?.detailSlice,
    ).toBe('ageing');
  });

  it('matches pipeline analysis', () => {
    const intent = matchPipelineHealthIntent('Give me a Pipeline Analysis', UserRole.SALES);
    expect(intent?.metric).toBe('pipeline_health');
    expect(intent?.filters?.detailSlice).toBe('analysis');
  });

  it('does not steal plain pipeline by stage', () => {
    expect(matchPipelineHealthIntent('Show my pipeline by stage', UserRole.SALES)).toBeNull();
  });
});

describe('chip wiring', () => {
  it('routes the three user phrases via matchExactChipIntent', () => {
    expect(matchExactChipIntent('Show my Stalled Pipeline', UserRole.SALES)?.metric).toBe(
      'pipeline_health',
    );
    expect(matchExactChipIntent('Show my Aeging Pipeline', UserRole.SALES)?.filters?.detailSlice).toBe(
      'ageing',
    );
    expect(matchExactChipIntent('Give me a Pipeline Analysis', UserRole.MANAGEMENT)?.metric).toBe(
      'pipeline_health',
    );
  });

  it('keeps plain pipeline by stage on pipeline_by_stage', () => {
    expect(matchExactChipIntent('Show my pipeline by stage', UserRole.SALES)?.metric).toBe(
      'pipeline_by_stage',
    );
  });

  it('routes weighted pipeline to expected pipeline_by_stage', () => {
    const intent = matchExactChipIntent("What's my weighted pipeline?", UserRole.SALES);
    expect(intent?.metric).toBe('pipeline_by_stage');
    expect(intent?.filters?.detailSlice).toBe('weighted');
    expect(matchExactChipIntent('Weighted open pipeline', UserRole.FINANCE)?.filters?.detailSlice).toBe(
      'weighted',
    );
  });
});
