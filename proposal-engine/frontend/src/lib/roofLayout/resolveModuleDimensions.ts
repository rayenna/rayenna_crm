import {
  ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M,
  ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M,
  getModuleDimensionsM,
} from '../roofLayoutConstants';
import { lookupModuleSkuCatalog } from './moduleSkuCatalog';
import { parseModuleSpecDimensions } from './parseModuleSpecDimensions';

export type ModuleDimensionSource =
  | 'artifact-spec'
  | 'crm-brand-catalog'
  | 'wattage-table'
  | 'default';

export type ResolveModuleDimensionsInput = {
  panelWattage: number;
  panelBrand?: string | null;
  /** Combined spec string from costing/BOM PV module line. */
  artifactSpecification?: string | null;
  /** Brand on the artifact line (may differ from CRM project brand). */
  artifactBrand?: string | null;
};

export type ResolvedModuleDimensions = {
  /** Portrait width (shorter edge) in metres. */
  portraitWidthM: number;
  /** Portrait height (longer edge) in metres. */
  portraitHeightM: number;
  source: ModuleDimensionSource;
  /** Short UI label, e.g. "BOM spec", "Waaree catalog". */
  sourceLabel: string;
};

function fromPortrait(
  widthM: number,
  heightM: number,
  source: ModuleDimensionSource,
  sourceLabel: string,
): ResolvedModuleDimensions {
  return {
    portraitWidthM: widthM,
    portraitHeightM: heightM,
    source,
    sourceLabel,
  };
}

/**
 * Resolve portrait module dimensions from CRM-linked artifacts and project fields.
 * Always falls back to the existing wattage table — no behaviour change when CRM data is sparse.
 */
export function resolveModuleDimensions(input: ResolveModuleDimensionsInput): ResolvedModuleDimensions {
  const wattage =
    Number.isFinite(input.panelWattage) && input.panelWattage > 0 ? input.panelWattage : 550;
  const spec = String(input.artifactSpecification ?? '').trim();
  const brand =
    String(input.panelBrand ?? '').trim() ||
    String(input.artifactBrand ?? '').trim() ||
    '';

  if (spec) {
    const parsed = parseModuleSpecDimensions(spec);
    if (
      parsed.widthM != null &&
      parsed.heightM != null &&
      parsed.widthM > 0 &&
      parsed.heightM > 0
    ) {
      return fromPortrait(parsed.widthM, parsed.heightM, 'artifact-spec', 'Costing/BOM spec');
    }
  }

  const catalog = lookupModuleSkuCatalog(brand, wattage);
  if (catalog) {
    return fromPortrait(
      catalog.widthM,
      catalog.heightM,
      'crm-brand-catalog',
      catalog.label,
    );
  }

  const fromWattage = getModuleDimensionsM(wattage);
  return fromPortrait(
    fromWattage.widthM,
    fromWattage.heightM,
    'wattage-table',
    'Wattage estimate',
  );
}

export function orientModuleDimensions(
  portrait: Pick<ResolvedModuleDimensions, 'portraitWidthM' | 'portraitHeightM'>,
  orientation: 'portrait' | 'landscape',
): { widthM: number; heightM: number } {
  const { portraitWidthM: w, portraitHeightM: h } = portrait;
  return orientation === 'portrait' ? { widthM: w, heightM: h } : { widthM: h, heightM: w };
}

/** Safe defaults when inputs are missing (matches legacy 550 W estimate). */
export function defaultModuleDimensions(): ResolvedModuleDimensions {
  return fromPortrait(
    ROOF_LAYOUT_DEFAULT_PANEL_WIDTH_M,
    ROOF_LAYOUT_DEFAULT_PANEL_HEIGHT_M,
    'default',
    'Default module',
  );
}
