import { describe, expect, it } from 'vitest';
import {
  attachAskDrillHrefs,
  projectsHrefForAskProjectIds,
  projectsHrefForIntent,
  resolveAskProjectsHref,
  type ZenithNlDateFilter,
} from './projectsHref';
import type { ZenithNlIntent, ZenithNlMetric, ZenithNlViz } from './catalog';

const emptyDates: ZenithNlDateFilter = {
  selectedFYs: [],
  selectedQuarters: [],
  selectedMonths: [],
};

function chart(
  metric: ZenithNlMetric,
  series: { label: string; value: number; count: number }[],
): { metric: ZenithNlMetric; viz: ZenithNlViz; intent: ZenithNlIntent } {
  return {
    metric,
    intent: { metric, filters: {} },
    viz: {
      kind: 'chart',
      title: metric,
      chartType: 'bar',
      series,
      valueLabel: 'Value',
    },
  };
}

describe('Ask chart slice → Projects href', () => {
  it('attaches precise drills for mix / ops / SLA / capacity charts', () => {
    const cases: Array<{
      metric: ZenithNlMetric;
      label: string;
      expectIncludes: string[];
    }> = [
      { metric: 'service_type_mix', label: 'EPC Project', expectIncludes: ['projectServiceType=EPC_PROJECT'] },
      { metric: 'panel_type_mix', label: 'DCR', expectIncludes: ['panelType=DCR', 'zenithSlice=revenue'] },
      { metric: 'roof_type_mix', label: 'Concrete-Flat', expectIncludes: ['roofType=Concrete-Flat'] },
      { metric: 'system_type_mix', label: 'On-grid', expectIncludes: ['systemType=ON_GRID'] },
      {
        metric: 'capacity_by_band',
        label: '3–5 kW',
        expectIncludes: ['capacityMin=3', 'capacityMax=5'],
      },
      { metric: 'project_stage_mix', label: 'Installation', expectIncludes: ['projectStage=INSTALLATION'] },
      { metric: 'sla_indicator_mix', label: 'RED', expectIncludes: ['statusIndicator=RED'] },
      { metric: 'ops_workload', label: 'Priya Ops', expectIncludes: ['opsName=Priya+Ops'] },
      {
        metric: 'revenue_by_salesperson',
        label: 'Alex Sales',
        expectIncludes: ['salespersonName=Alex+Sales', 'zenithSlice=revenue'],
      },
      { metric: 'revenue_by_city', label: 'Kochi', expectIncludes: ['city=Kochi'] },
      { metric: 'hub_plant_link_summary', label: 'Hub plant linked', expectIncludes: ['hubPlantLinked=true'] },
      { metric: 'hub_plant_link_summary', label: 'Not linked', expectIncludes: ['hubPlantLinked=false'] },
      {
        metric: 'installation_model_status',
        label: 'In progress',
        expectIncludes: ['installationStatus=IN_PROGRESS'],
      },
      { metric: 'payment_mode_mix', label: 'UPI', expectIncludes: ['paymentMode=UPI'] },
      {
        metric: 'loan_vs_cash_revenue',
        label: 'Not on loan',
        expectIncludes: ['notAvailingLoan=true'],
      },
      {
        metric: 'pipeline_by_stage',
        label: 'Confirmed Order',
        expectIncludes: ['status=CONFIRMED'],
      },
    ];

    for (const c of cases) {
      const { metric, viz, intent } = chart(c.metric, [
        { label: c.label, value: 10, count: 2 },
      ]);
      const out = attachAskDrillHrefs(metric, viz, intent, emptyDates);
      expect(out.kind).toBe('chart');
      if (out.kind !== 'chart') continue;
      const href = out.series[0]?.href || '';
      expect(href.startsWith('/projects?'), `${metric}/${c.label} → ${href}`).toBe(true);
      for (const part of c.expectIncludes) {
        expect(href, `${metric}/${c.label} missing ${part} in ${href}`).toContain(part);
      }
    }
  });

  it('keeps every non-empty series clickable (href present)', () => {
    const metrics: ZenithNlMetric[] = [
      'panel_brand_mix',
      'inverter_brand_mix',
      'revenue_by_lead_source',
      'revenue_by_project_type',
      'revenue_by_customer_type',
      'payment_status_breakdown',
      'proposal_engine_buckets',
      'lost_competition_breakdown',
    ];
    for (const metric of metrics) {
      const label =
        metric === 'revenue_by_lead_source'
          ? 'Website'
          : metric === 'revenue_by_project_type'
            ? 'Subsidy'
            : metric === 'revenue_by_customer_type'
              ? 'Residential'
              : metric === 'payment_status_breakdown'
                ? 'Pending'
                : metric === 'proposal_engine_buckets'
                  ? 'PE Ready'
                  : metric === 'lost_competition_breakdown'
                    ? 'Price'
                    : 'Waaree';
      const { viz, intent } = chart(metric, [{ label, value: 5, count: 1 }]);
      const out = attachAskDrillHrefs(metric, viz, intent, emptyDates);
      if (out.kind !== 'chart') throw new Error('expected chart');
      expect(out.series[0]?.href, metric).toBeTruthy();
    }
  });
});

describe('Ask Open in Projects pins deal lists', () => {
  it('builds repeated id query params', () => {
    const href = projectsHrefForAskProjectIds([
      'cmkxknrqr0004xc1bzozlo19j',
      'cmu27mizh002wm7uu413s4nj9',
    ]);
    expect(href).toContain('id=cmkxknrqr0004xc1bzozlo19j');
    expect(href).toContain('id=cmu27mizh002wm7uu413s4nj9');
    expect(href).not.toContain('status=');
  });

  it('does not fall back stalled pipeline to every open stage', () => {
    expect(
      projectsHrefForIntent(
        'pipeline_health',
        { metric: 'pipeline_health', filters: { detailSlice: 'stalled' } },
        emptyDates,
      ),
    ).toBeNull();
  });

  it('pins Open in Projects to stalled row ids instead of the full pipeline', () => {
    const href = resolveAskProjectsHref({
      metric: 'pipeline_health',
      viz: {
        kind: 'table',
        title: 'Stalled pipeline',
        columns: [{ key: 'sl', label: 'SL' }],
        rows: [
          { sl: 129, projectId: 'cmkxknrqr0004xc1bzozlo19j', href: '/projects/cmkxknrqr0004xc1bzozlo19j' },
          { sl: 74, projectId: 'cmu27mizh002wm7uu413s4nj9', href: '/projects/cmu27mizh002wm7uu413s4nj9' },
        ],
      },
      executedHref: '/projects?status=LEAD,SITE_SURVEY,PROPOSAL,CONFIRMED,UNDER_INSTALLATION',
      fallbackHref: '/projects?status=LEAD&status=SITE_SURVEY',
    });
    expect(href).toContain('id=cmkxknrqr0004xc1bzozlo19j');
    expect(href).toContain('id=cmu27mizh002wm7uu413s4nj9');
    expect(href).not.toContain('status=');
  });
});
