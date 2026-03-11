export interface PanelPackingInput {
  systemSizeKw: number;
  panelWattage: number;
  usableAreaM2: number;
}

export interface PanelPackingResult {
  panelCount: number;
}

export function computePanelPacking(input: PanelPackingInput): PanelPackingResult {
  const panelAreaM2 = 2.4; // Approximate area of a standard panel
  const panelsRequired = Math.floor((input.systemSizeKw * 1000) / input.panelWattage);
  const maxPanelsByArea = Math.floor(input.usableAreaM2 / panelAreaM2);
  const panelCount = Math.min(panelsRequired, maxPanelsByArea);
  return { panelCount };
}

