const DEFAULT_PANEL_W = 275;
const DEFAULT_SYSTEM_KW = 5.5;

export type ProjectSystemFields = {
  systemCapacity: number | null;
  panelBrand: string | null;
  panelType: string | null;
  panelCapacityW: number | null;
  inverterBrand: string | null;
  inverterCapacityKw: number | null;
};

export type ConsumerSystemSpecDto = {
  systemKw: number;
  panelCount: number;
  panelBrand: string | null;
  panelType: string | null;
  panelCapacityW: number | null;
  panelLabel: string;
  inverterBrand: string | null;
  inverterCapacityKw: number | null;
  inverterLabel: string;
  /** One line for compact surfaces (Home project card). */
  equipmentSummary: string;
};

export function resolvePanelCount(
  systemKw: number,
  panelCapacityW: number | null,
): number {
  const w = panelCapacityW && panelCapacityW > 0 ? panelCapacityW : DEFAULT_PANEL_W;
  return Math.max(1, Math.round((systemKw * 1000) / w));
}

function joinParts(parts: (string | null | undefined)[], fallback: string): string {
  const filtered = parts.filter(Boolean) as string[];
  return filtered.length > 0 ? filtered.join(' · ') : fallback;
}

export function buildPanelLabel(input: {
  panelCount: number;
  panelCapacityW: number | null;
  panelBrand: string | null;
  panelType: string | null;
}): string {
  const watt = input.panelCapacityW && input.panelCapacityW > 0 ? input.panelCapacityW : null;
  const countWatt =
    watt != null ? `${input.panelCount} × ${watt}W` : `${input.panelCount} panels`;

  return joinParts(
    [countWatt, input.panelBrand, input.panelType ? formatPanelType(input.panelType) : null],
    'Panel details pending',
  );
}

function formatPanelType(panelType: string): string {
  if (panelType === 'DCR') return 'DCR';
  if (panelType === 'Non-DCR' || panelType === 'NON_DCR') return 'Non-DCR';
  return panelType;
}

export function buildInverterLabel(input: {
  inverterBrand: string | null;
  inverterCapacityKw: number | null;
}): string {
  const capacity =
    input.inverterCapacityKw && input.inverterCapacityKw > 0
      ? `${input.inverterCapacityKw} kW`
      : null;

  return joinParts([input.inverterBrand, capacity], 'Inverter details pending');
}

export function buildConsumerSystemSpec(project: ProjectSystemFields): ConsumerSystemSpecDto {
  const hasCapacity = Boolean(project.systemCapacity && project.systemCapacity > 0);
  const systemKw = hasCapacity ? project.systemCapacity! : DEFAULT_SYSTEM_KW;

  const hasPanelData = Boolean(
    project.panelBrand || project.panelType || project.panelCapacityW,
  );
  const hasInverterData = Boolean(project.inverterBrand || project.inverterCapacityKw);

  const panelCount = resolvePanelCount(systemKw, project.panelCapacityW);
  const panelLabel = hasPanelData
    ? buildPanelLabel({
        panelCount,
        panelCapacityW: project.panelCapacityW,
        panelBrand: project.panelBrand,
        panelType: project.panelType,
      })
    : 'Panel details pending';
  const inverterLabel = hasInverterData
    ? buildInverterLabel({
        inverterBrand: project.inverterBrand,
        inverterCapacityKw: project.inverterCapacityKw,
      })
    : 'Inverter details pending';

  const capacityLabel = hasCapacity ? `${systemKw} kW` : 'Capacity pending';

  return {
    systemKw,
    panelCount,
    panelBrand: project.panelBrand,
    panelType: project.panelType,
    panelCapacityW: project.panelCapacityW,
    panelLabel,
    inverterBrand: project.inverterBrand,
    inverterCapacityKw: project.inverterCapacityKw,
    inverterLabel,
    equipmentSummary: `${capacityLabel} · ${panelLabel} · ${inverterLabel}`,
  };
}
