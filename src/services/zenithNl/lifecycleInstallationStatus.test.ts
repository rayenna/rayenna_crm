import { describe, expect, it } from 'vitest';
import { ProjectStatus, ProjectType } from '@prisma/client';
import {
  buildLifecycleInstallationStatus,
  latestLifecycleMilestone,
} from './lifecycleInstallationStatus';

describe('buildLifecycleInstallationStatus', () => {
  it('combines Net Meter Installation with Subsidy credited (Project Lifecycle)', () => {
    const phrase = buildLifecycleInstallationStatus({
      projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      type: ProjectType.SUBSIDY,
      mnrePortalRegistrationDate: new Date('2026-04-14'),
      feasibilityDate: new Date('2026-04-29'),
      registrationDate: new Date('2026-05-14'),
      installationCompletionDate: new Date('2026-05-09'),
      completionReportSubmissionDate: new Date('2026-05-14'),
      subsidyRequestDate: new Date('2026-05-23'),
      subsidyCreditedDate: new Date('2026-06-01'),
    });
    expect(phrase).toBe('Net Meter Installation complete and Subsidy credited');
  });

  it('mentions pending subsidy credit for Completed subsidy projects', () => {
    const phrase = buildLifecycleInstallationStatus({
      projectStatus: ProjectStatus.COMPLETED,
      type: ProjectType.SUBSIDY,
      installationCompletionDate: new Date('2026-05-09'),
      subsidyRequestDate: new Date('2026-05-23'),
    });
    expect(phrase).toBe('Net Meter Installation complete · Pending subsidy credit');
  });

  it('uses latest milestone under Installation', () => {
    const phrase = buildLifecycleInstallationStatus({
      projectStatus: ProjectStatus.UNDER_INSTALLATION,
      type: ProjectType.SUBSIDY,
      registrationDate: new Date('2026-05-01'),
      installationCompletionDate: null,
    });
    expect(phrase).toBe('DISCOM registration complete · Under Installation');
  });

  it('falls back to stage label when no lifecycle dates', () => {
    expect(
      buildLifecycleInstallationStatus({
        projectStatus: ProjectStatus.CONFIRMED,
        type: ProjectType.NON_SUBSIDY,
      }),
    ).toBe('Confirmed Order — installation not started');
  });
});

describe('latestLifecycleMilestone', () => {
  it('picks Net Meter when it is the latest date', () => {
    const latest = latestLifecycleMilestone({
      projectStatus: ProjectStatus.COMPLETED_SUBSIDY_CREDITED,
      installationCompletionDate: new Date('2026-05-09'),
      subsidyRequestDate: new Date('2026-05-23'),
      subsidyCreditedDate: new Date('2026-05-20'),
    });
    expect(latest?.key).toBe('netMeter');
    expect(latest?.completePhrase).toBe('Net Meter Installation complete');
  });
});
