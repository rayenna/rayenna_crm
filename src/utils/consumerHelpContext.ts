import type { MaintenanceScheduleStatus } from '@prisma/client';
import type { SystemHealthStatus } from '../services/consumerMaintainService';

export type HelpContextScreen = 'home' | 'track' | 'maintain' | 'help' | 'all';

export type ConsumerHelpContextSuggestion = {
  id: string;
  screens: HelpContextScreen[];
  articleId: string;
  title: string;
  subtitle: string;
  reason: string;
  priority: number;
};

export type ConsumerHelpContextSignals = {
  isLive: boolean;
  currentStepKey: string | null;
  hasNetMeterDate: boolean;
  systemHealth: SystemHealthStatus;
  hasOverdueMaintenance: boolean;
  hasDueMaintenance: boolean;
  warrantyYearsMin: number | null;
  monthGeneratedKwh: number;
  isEstimatedEnergy: boolean;
  isMonsoonSeason: boolean;
  hasGridExport: boolean;
};

const MONSOON_MONTHS = new Set([6, 7, 8, 9]);

export function isMonsoonMonth(month: number): boolean {
  return MONSOON_MONTHS.has(month);
}

/** Pure rule engine — unit-testable without DB. */
export function buildConsumerHelpContextSuggestions(
  signals: ConsumerHelpContextSignals,
): ConsumerHelpContextSuggestion[] {
  const items: ConsumerHelpContextSuggestion[] = [];

  const push = (item: Omit<ConsumerHelpContextSuggestion, 'priority'> & { priority: number }) => {
    items.push(item);
  };

  if (signals.systemHealth === 'CRITICAL') {
    push({
      id: 'health-critical',
      screens: ['home', 'maintain', 'help'],
      articleId: 'inverter-troubleshooting',
      title: 'Inverter troubleshooting',
      subtitle: 'Your system needs attention',
      reason: signals.systemHealth === 'CRITICAL' ? 'System health is critical' : 'Check inverter status',
      priority: 10,
    });
  } else if (signals.systemHealth === 'WARNING') {
    push({
      id: 'health-warning',
      screens: ['home', 'maintain', 'help'],
      articleId: 'inverter-troubleshooting',
      title: 'Inverter troubleshooting',
      subtitle: 'Resolve warnings before they worsen',
      reason: 'Generation looks lower than expected',
      priority: 20,
    });
  }

  if (!signals.isLive && signals.currentStepKey === 'billing') {
    push({
      id: 'billing-step',
      screens: ['home', 'track', 'help'],
      articleId: 'kseb-net-metering-guide',
      title: 'KSEB net metering guide',
      subtitle: 'What happens during billing & grid connection',
      reason: 'Your project is in billing & subsidy',
      priority: 30,
    });
  }

  if (signals.isLive && !signals.hasNetMeterDate) {
    push({
      id: 'missing-net-meter-date',
      screens: ['home', 'maintain', 'help'],
      articleId: 'kseb-net-metering-guide',
      title: 'KSEB net metering guide',
      subtitle: 'Track DISCOM progress with Rayenna',
      reason: 'Net meter date not recorded yet',
      priority: 35,
    });
  }

  if (signals.hasOverdueMaintenance) {
    push({
      id: 'maintenance-overdue',
      screens: ['home', 'maintain', 'help'],
      articleId: 'panel-cleaning-guide',
      title: 'Panel cleaning guide',
      subtitle: 'Schedule or learn about your visit plan',
      reason: 'A maintenance visit is overdue',
      priority: 40,
    });
  } else if (signals.hasDueMaintenance) {
    push({
      id: 'maintenance-due',
      screens: ['maintain', 'help'],
      articleId: 'panel-cleaning-guide',
      title: 'Panel cleaning guide',
      subtitle: 'Prepare for your upcoming visit',
      reason: 'Panel cleaning is due soon',
      priority: 45,
    });
  }

  if (signals.warrantyYearsMin !== null && signals.warrantyYearsMin < 2) {
    push({
      id: 'warranty-expiring',
      screens: ['maintain', 'help'],
      articleId: 'warranty-guide',
      title: 'Warranty guide',
      subtitle: 'Coverage ending within 2 years',
      reason: 'Review warranty before expiry',
      priority: 50,
    });
  }

  if (signals.isLive && signals.monthGeneratedKwh <= 0) {
    push({
      id: 'zero-generation',
      screens: ['home', 'track', 'help'],
      articleId: 'inverter-troubleshooting',
      title: 'Inverter troubleshooting',
      subtitle: 'No generation recorded this month',
      reason: 'Zero kWh showing in Track',
      priority: 55,
    });
  }

  if (signals.isLive && signals.isMonsoonSeason) {
    push({
      id: 'monsoon-season',
      screens: ['home', 'track', 'help'],
      articleId: 'monsoon-solar-tips',
      title: 'Monsoon solar tips',
      subtitle: 'Lower output is normal in Kerala rains',
      reason: 'Monsoon season (Jun–Sep)',
      priority: 60,
    });
  }

  if (signals.isLive && (signals.hasGridExport || signals.isEstimatedEnergy)) {
    push({
      id: 'solar-bill',
      screens: ['track', 'help'],
      articleId: 'understanding-solar-bill',
      title: 'Understanding your solar bill',
      subtitle: 'Import, export & Track vs KSEB',
      reason: signals.hasGridExport ? 'You are exporting to the grid' : 'Estimated readings — compare with your bill',
      priority: 70,
    });
  }

  if (signals.isLive) {
    push({
      id: 'warranty-live',
      screens: ['maintain'],
      articleId: 'warranty-guide',
      title: 'Warranty guide',
      subtitle: 'Coverage, claims & exclusions',
      reason: 'Keep warranty details handy',
      priority: 90,
    });
  }

  if (!signals.isLive) {
    push({
      id: 'hub-basics',
      screens: ['home', 'help'],
      articleId: 'kseb-net-metering-guide',
      title: 'KSEB net metering guide',
      subtitle: 'What to expect before your system is live',
      reason: 'Project still commissioning',
      priority: 95,
    });
  }

  const byArticle = new Map<string, ConsumerHelpContextSuggestion>();
  for (const item of items.sort((a, b) => a.priority - b.priority)) {
    if (!byArticle.has(item.articleId)) {
      byArticle.set(item.articleId, item);
    }
  }

  return [...byArticle.values()].sort((a, b) => a.priority - b.priority);
}

export function filterSuggestionsForScreen(
  suggestions: ConsumerHelpContextSuggestion[],
  screen: HelpContextScreen,
  limit = 3,
): ConsumerHelpContextSuggestion[] {
  if (screen === 'all') {
    return suggestions.slice(0, limit);
  }
  return suggestions
    .filter((s) => s.screens.includes(screen) || s.screens.includes('all'))
    .slice(0, limit);
}

export function maintenanceFlagsFromSchedule(
  schedule: { status: MaintenanceScheduleStatus }[],
): { hasOverdueMaintenance: boolean; hasDueMaintenance: boolean } {
  return {
    hasOverdueMaintenance: schedule.some((s) => s.status === 'OVERDUE'),
    hasDueMaintenance: schedule.some((s) => s.status === 'DUE'),
  };
}
