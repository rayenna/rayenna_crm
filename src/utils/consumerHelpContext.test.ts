import { describe, expect, it } from 'vitest';
import {
  buildConsumerHelpContextSuggestions,
  filterSuggestionsForScreen,
  isMonsoonMonth,
} from './consumerHelpContext';

const baseSignals = {
  isLive: true,
  currentStepKey: 'live',
  hasNetMeterDate: true,
  systemHealth: 'OPTIMAL' as const,
  hasOverdueMaintenance: false,
  hasDueMaintenance: false,
  warrantyYearsMin: 10,
  monthGeneratedKwh: 320,
  isEstimatedEnergy: true,
  isMonsoonSeason: false,
  hasGridExport: 40,
};

describe('consumerHelpContext', () => {
  it('prioritises critical health over seasonal tips', () => {
    const items = buildConsumerHelpContextSuggestions({
      ...baseSignals,
      systemHealth: 'CRITICAL',
      isMonsoonSeason: true,
    });
    expect(items[0]?.articleId).toBe('inverter-troubleshooting');
  });

  it('suggests net metering guide during billing step', () => {
    const items = buildConsumerHelpContextSuggestions({
      ...baseSignals,
      isLive: false,
      currentStepKey: 'billing',
    });
    expect(items.some((i) => i.articleId === 'kseb-net-metering-guide')).toBe(true);
  });

  it('suggests panel cleaning when maintenance is overdue', () => {
    const items = buildConsumerHelpContextSuggestions({
      ...baseSignals,
      hasOverdueMaintenance: true,
    });
    expect(items.some((i) => i.articleId === 'panel-cleaning-guide')).toBe(true);
  });

  it('filters suggestions per screen', () => {
    const items = buildConsumerHelpContextSuggestions({
      ...baseSignals,
      hasGridExport: 100,
    });
    const track = filterSuggestionsForScreen(items, 'track', 3);
    expect(track.every((i) => i.screens.includes('track') || i.screens.includes('all'))).toBe(
      true,
    );
  });

  it('detects monsoon months', () => {
    expect(isMonsoonMonth(7)).toBe(true);
    expect(isMonsoonMonth(3)).toBe(false);
  });
});
