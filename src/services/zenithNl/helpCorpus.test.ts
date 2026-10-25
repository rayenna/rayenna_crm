import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { loadHelpCorpus, searchHelpCorpus } from './helpCorpus';
import { execHelpLookup, matchHelpLookupIntent } from './helpLookupAsk';
import { matchExactChipIntent } from './chipIntents';
import { matchAskActionIntent } from './askActions';

describe('Help corpus for Ask', () => {
  it('loads bundled CRM Help markdown', () => {
    const corpus = loadHelpCorpus();
    expect(corpus.length).toBeGreaterThan(20);
    expect(corpus.some((c) => c.routeKey === 'modules')).toBe(true);
  });

  it('finds Panel and Inverter brand under Project Lifecycle', () => {
    const hits = searchHelpCorpus('Where do I add the Panel and Inverter brand in CRM?', 6);
    expect(hits.length).toBeGreaterThan(0);
    const hay = hits
      .map((h) => `${h.heading} ${h.body}`)
      .join(' ')
      .toLowerCase();
    expect(hay).toMatch(/panel brand/);
    expect(hay).toMatch(/inverter brand/);
    expect(hits.some((h) => h.href.startsWith('/help/modules#'))).toBe(true);
    expect(hits[0]?.href).toMatch(/^\/help\/(modules|getting-started)#/);
  });

  it('routes the example chip to help_lookup', () => {
    const intent = matchExactChipIntent(
      'Where do I add the Panel and Inverter brand in CRM?',
      UserRole.SALES,
    );
    expect(intent?.metric).toBe('help_lookup');
  });

  it('does not steal analytics or Open Help', () => {
    expect(matchHelpLookupIntent('How many projects used Adani panels?', UserRole.ADMIN)).toBeNull();
    expect(matchHelpLookupIntent("What's my weighted pipeline?", UserRole.ADMIN)).toBeNull();
    expect(matchHelpLookupIntent('Open Help', UserRole.ADMIN)).toBeNull();
    expect(matchAskActionIntent('Open Help', UserRole.ADMIN)?.action).toBe('go_help');
    expect(
      matchAskActionIntent('Where do I add the Panel and Inverter brand in CRM?', UserRole.ADMIN),
    ).toBeNull();
  });

  it('matches other how-to phrasing', () => {
    expect(matchHelpLookupIntent('How do I change my password?', UserRole.FINANCE)?.metric).toBe(
      'help_lookup',
    );
    expect(matchHelpLookupIntent('What is Ask Zenith?', UserRole.OPERATIONS)?.metric).toBe(
      'help_lookup',
    );
  });

  it('returns a Help-grounded answer for the panel/inverter brand question', async () => {
    const out = await execHelpLookup('Where do I add the Panel and Inverter brand in CRM?');
    expect(out.viz.kind).toBe('table');
    expect(out.projectsHref).toMatch(/^\/help\//);
    expect(out.insight.toLowerCase()).toMatch(/lifecycle|edit project|panel brand/);
    expect(out.viz.kind === 'table' && out.viz.rows.some((r) => String(r.href || '').startsWith('/help/'))).toBe(
      true,
    );
  });
});
