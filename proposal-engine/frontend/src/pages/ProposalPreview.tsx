import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getActiveCustomer,
  saveAllArtifacts,
  formatEmailForDisplay,
  clearProposalArtifact,
  getWipKeysForCurrentUser,
} from '../lib/customerStore';
import type {
  CostingArtifact,
  BomArtifact,
  RoiArtifact,
  ProposalArtifact,
  ProposalCustomSectionBeforeBoq,
} from '../lib/customerStore';
import {
  getCurrentUserRole,
  syncProjectProposal,
  syncProjectCosting,
  syncProjectBom,
  syncProjectRoi,
  createProposalShare,
  generateAiRoofLayout,
  fetchCrmProjectForAiLayout,
  fetchManualRoofLayout,
  type AiRoofLayoutResponse,
} from '../lib/apiClient';
import { normalizeCustomSectionsBeforeBoq, stripPeManagedSectionsFromDocHtml } from '../lib/proposalCustomSections';
import { CustomSectionsBeforeBoq } from '../components/CustomSectionsBeforeBoq';
import { exportToPdf } from '../proposal/exportPdf';
import {
  mergeProposalEditableInnerHtml,
  extractMergedProposalTextOverrides,
} from '../proposal/proposalEditableHtml';
import {
  buildProposal,
  collectProposalAssembly,
  rehydrateProposalData,
  cloneProposalForStorage,
  parseStoredProposalView,
  readWipStorage,
} from '../proposal/proposalAssembly';
import { execSummary, closingText, SUBSIDY_DISCLAIMER_TEXT, CLIENT_SCOPE, TERMS_AND_CONDITIONS, SERVICE_DETAILS, PAYMENT_TERMS, WARRANTY_TERMS, DELIVERY_TERMS } from '../proposal/proposalCopy';
import type { CustomerDetails, ProposalData, ROIResult } from '../proposal/types';
import {
  ProposalTextOverridesContext,
  Divider,
  ExecutiveSummaryBlock,
  AboutRayennaBlock,
  WhatWeOfferBlock,
  FinancialBenefitsBlock,
  EnvironmentalImpactBlock,
  RoofLayoutBlock,
  OurProcessBlock,
  ScopeOfWorkBlock,
  BOMGroupedTable,
  CommercialsBlock,
  ListBlock,
  AccountDetailsBlock,
  SectionBlock,
  CustomerForm,
  exportToDocx,
} from '../proposal/ProposalDocumentBlocks';
import { ProposalShareModal } from '../proposal/ProposalShareModal';

export default function ProposalPreview() {
  const navigate = useNavigate();
  const [proposal, setProposal]               = useState<ProposalData | null>(null);
  const [exporting, setExporting]             = useState<'pdf' | 'docx' | null>(null);
  const [savedToCustomer, setSavedToCustomer] = useState<string | null>(null);
  const [bomComments, setBomComments]         = useState<Record<string, string>>({});
  const [bomCollapsed, setBomCollapsed]       = useState<Record<string, boolean>>({});
  const [bomAllCollapsed, setBomAllCollapsed] = useState(true);
  const [isEditing, setIsEditing]             = useState(false);
  const [saveStatus, setSaveStatus]           = useState<'idle' | 'saving' | 'saved'>('idle');
  const [includeRoofLayout, setIncludeRoofLayout] = useState(false);
  const [roofLayout, setRoofLayout]               = useState<AiRoofLayoutResponse | null>(null);
  const [roofLayoutLoading, setRoofLayoutLoading] = useState(false);
  const [roofLayoutError, setRoofLayoutError]     = useState<string | null>(null);
  const printRef                              = useRef<HTMLDivElement>(null);
  // Ref to the contentEditable document body div so we can read its innerHTML on save
  /** Split so nested rich editors (custom sections) are not inside a parent contentEditable — paste/images break otherwise. */
  const docBodyTopRef                         = useRef<HTMLDivElement>(null);
  const docBodyBottomRef                      = useRef<HTMLDivElement>(null);

  const [shareModalOpen, setShareModalOpen]         = useState(false);
  const [shareLink, setShareLink]                   = useState<string | null>(null);
  const [shareCreating, setShareCreating]           = useState(false);
  const [shareError, setShareError]                = useState<string | null>(null);
  const [shareUsePassword, setShareUsePassword]     = useState(false);
  const [sharePassword, setSharePassword]          = useState('');
  const [shareUseCustomValidity, setShareUseCustomValidity] = useState(false);
  const [shareExpiryDate, setShareExpiryDate]      = useState('');
  const [shareLinkCopied, setShareLinkCopied]      = useState(false);
  const [displayTextOverrides, setDisplayTextOverrides] = useState<Record<string, string | undefined>>({});
  const [customSectionsBeforeBoq, setCustomSectionsBeforeBoq] = useState<ProposalCustomSectionBeforeBoq[]>([]);

  const role = getCurrentUserRole();
  const canWrite = role != null && ['ADMIN', 'SALES'].includes(String(role).toUpperCase());

  useEffect(() => {
    if (!canWrite && isEditing) setIsEditing(false);
  }, [canWrite, isEditing]);

  // Reset BOM collapse state whenever a new BOM is loaded
  useEffect(() => {
    setBomCollapsed({});
    setBomAllCollapsed(true);
  }, [proposal?.bom]);

  // Track the active customer ID so CustomerForm remounts when the customer changes.
  // This guarantees the form fields always reflect the correct customer.
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(
    () => getActiveCustomer()?.id ?? null,
  );

  // Poll for active customer changes (covers navigating away and back, or switching
  // customer in another tab). Runs every time the page gains focus.
  useEffect(() => {
    const sync = () => {
      const id = getActiveCustomer()?.id ?? null;
      setActiveCustomerId(id);
      // We intentionally do NOT clear an already-rendered proposal on focus.
      // This keeps the proposal open even when the user switches browser tabs.
    };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  // Restore generated proposal + BOQ notes + saved text overrides when opening this page or switching customers.
  useEffect(() => {
    const ac = getActiveCustomer();
    if (!ac) {
      setProposal(null);
      setDisplayTextOverrides({});
      setBomComments({});
      setCustomSectionsBeforeBoq([]);
      return;
    }
    const saved = ac.proposal;
    if (!saved?.refNumber?.trim() || !saved.generatedAt?.trim()) {
      setProposal(null);
      setDisplayTextOverrides({});
      setBomComments({});
      setCustomSectionsBeforeBoq([]);
      return;
    }

    const fromView = parseStoredProposalView(saved.proposalView);
    if (fromView) {
      setProposal(fromView);
    } else {
      const asm = collectProposalAssembly(ac);
      if (!asm) {
        setProposal(null);
        setDisplayTextOverrides({});
        setBomComments({});
        setCustomSectionsBeforeBoq([]);
        return;
      }
      setProposal(
        rehydrateProposalData(
          { refNumber: saved.refNumber, generatedAt: saved.generatedAt },
          asm.customer,
          asm.sheet,
          asm.bom,
          asm.roi,
          asm.roiAutofill,
          asm.meta,
        ),
      );
    }

    setBomComments(saved.bomComments ?? {});
    setDisplayTextOverrides(saved.textOverrides ?? {});
    setCustomSectionsBeforeBoq(normalizeCustomSectionsBeforeBoq(saved.customSectionsBeforeBoq));
    setIsEditing(false);
    setIncludeRoofLayout(!!saved.includeRoofLayout);
  }, [activeCustomerId]);

  // Restore roof layout inclusion state when reopening a saved customer/proposal.
  // Also try to load the latest saved roof layout from backend for this CRM project so the
  // user doesn't need to regenerate and adjust polygon every time.
  useEffect(() => {
    const ac = getActiveCustomer();
    const savedInclude = !!ac?.proposal?.includeRoofLayout;
    const savedLayout = ac?.proposal?.roofLayout ?? null;
    setIncludeRoofLayout(savedInclude);
    setRoofLayout(savedLayout as any);
    setRoofLayoutError(null);

    const crmProjectId = ac?.master?.crmProjectId;
    if (!crmProjectId) return;

    // If include is on (or we have a saved layout), fetch the latest manual layout (if any).
    // This ensures the section remains available even if localStorage was cleared or the user changed devices.
    if (!savedInclude && !savedLayout) return;

    let cancelled = false;
    setRoofLayoutLoading(true);
    void (async () => {
      try {
        const manual = await fetchManualRoofLayout(crmProjectId);
        if (cancelled) return;
        if (manual && typeof (manual as any).layout_image_url === 'string' && String((manual as any).layout_image_url).trim()) {
          const next: AiRoofLayoutResponse = {
            roof_area_m2: Number.isFinite(Number((manual as any).roof_area_m2)) ? Number((manual as any).roof_area_m2) : 0,
            usable_area_m2: Number.isFinite(Number((manual as any).usable_area_m2)) ? Number((manual as any).usable_area_m2) : 0,
            panel_count: Number.isFinite(Number((manual as any).panel_count)) ? Number((manual as any).panel_count) : 0,
            layout_image_url: String((manual as any).layout_image_url),
            source: (manual as any).source ?? 'MANUAL',
          };
          if ((manual as any).layout_image_3d_url != null && String((manual as any).layout_image_3d_url).trim()) {
            next.layout_image_3d_url = String((manual as any).layout_image_3d_url);
          }
          if (typeof (manual as any).prefer_3d_for_proposal === 'boolean') {
            next.prefer_3d_for_proposal = (manual as any).prefer_3d_for_proposal;
          }
          setRoofLayout(next);
          // Persist the latest payload to local workspace so it’s instant next time.
          if (ac?.id && ac.proposal) {
            saveAllArtifacts(ac.id, null, null, null, {
              ...ac.proposal,
              includeRoofLayout: true,
              roofLayout: next,
            });
          }
        }
        setRoofLayoutLoading(false);
      } catch {
        if (!cancelled) {
          setRoofLayoutLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCustomerId]);

  // Saved inline edits: textOverrides + ProposalTextOverridesContext (not full editedHtml) so BOQ stays interactive.

  // ── Save comments to active customer record ──
  const persistComments = (comments: Record<string, string>) => {
    const ac = getActiveCustomer();
    if (ac && ac.proposal) {
      saveAllArtifacts(ac.id, null, null, null, {
        ...ac.proposal,
        bomComments: comments,
      });
    }
  };

  // ── Unified save: comments + inline edits + textOverrides + all 4 artifacts ──
  const handleSave = () => {
    if (!canWrite) return;
    if (!proposal) return;
    setSaveStatus('saving');

    // 1. Capture current edited HTML and extract per-section text overrides
    const editedHtml = (() => {
      const merged = mergeProposalEditableInnerHtml(docBodyTopRef.current, docBodyBottomRef.current);
      const cleaned = stripPeManagedSectionsFromDocHtml(merged);
      return cleaned.trim() === '' ? undefined : cleaned;
    })();
    const textOverrides = extractMergedProposalTextOverrides(
      docBodyTopRef.current,
      docBodyBottomRef.current,
    );
    const textOverridesMaybeEmpty =
      Object.keys(textOverrides).length > 0 ? textOverrides : undefined;
    const customSectionsSnapshot = normalizeCustomSectionsBeforeBoq(customSectionsBeforeBoq);

    // 2. Persist BOM comments
    persistComments(bomComments);

    // 3. Save all 4 artifacts + editedHtml + textOverrides to active customer record
    const activeCustomer = getActiveCustomer();
    if (activeCustomer) {
      const sheet = proposal.sheet;
      const bom   = proposal.bom;
      const roi: ROIResult | null = readWipStorage(getWipKeysForCurrentUser().roiResult);
      const now   = new Date().toISOString();

      const costingArtifact: CostingArtifact | null = sheet ? {
        sheetName:     sheet.name,
        savedAt:       sheet.savedAt,
        items:         sheet.items,
        showGst:       sheet.showGst,
        marginPercent: sheet.marginPercent,
        grandTotal:    sheet.grandTotal,
        totalGst:      sheet.totalGst ?? 0,
        systemSizeKw:  sheet.systemSizeKw,
      } : null;

      const bomArtifact: BomArtifact | null = bom.length > 0 ? { savedAt: now, rows: bom } : null;
      const roiArtifact: RoiArtifact | null = roi ? { savedAt: now, result: roi as any } : null;

      const proposalArtifact: ProposalArtifact = {
        refNumber:   proposal.refNumber,
        generatedAt: proposal.generatedAt,
        summary:     execSummary(proposal).slice(0, 200),
        bomComments,
        editedHtml,
        textOverrides: textOverridesMaybeEmpty,
        customSectionsBeforeBoq: customSectionsSnapshot,
        proposalView: cloneProposalForStorage(proposal),
        includeRoofLayout,
        roofLayout: includeRoofLayout ? (roofLayout ?? null) : null,
      };

      saveAllArtifacts(activeCustomer.id, costingArtifact, bomArtifact, roiArtifact, proposalArtifact);
      setCustomSectionsBeforeBoq(customSectionsSnapshot);
      setSavedToCustomer(activeCustomer.master.name);

      // Sync all four artifacts to CRM backend so Admin/Ops/Finance/Management see the same data.
      const projectId = activeCustomer.master.crmProjectId;
      if (projectId) {
        if (costingArtifact) void syncProjectCosting(projectId, costingArtifact);
        if (bomArtifact) void syncProjectBom(projectId, bomArtifact);
        if (roiArtifact) void syncProjectRoi(projectId, roiArtifact);
        void syncProjectProposal(projectId, proposalArtifact);
      }
    }

    // 4. Exit edit mode
    setIsEditing(false);
    setDisplayTextOverrides(textOverrides ?? {});
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleSaveAndClose = () => {
    if (!canWrite || !proposal) return;
    handleSave();
    // Give a small delay so the saved banner / state can update, then go back to Dashboard
    setTimeout(() => {
      navigate('/');
    }, 400);
  };

  const handleGenerate = async (
    _customer: CustomerDetails,
    options: { includeRoofLayout: boolean },
  ) => {
    const activeCustomer = getActiveCustomer();
    const asm = collectProposalAssembly(activeCustomer);
    if (!asm) return;

    const { customer, sheet, bom, roi, roiAutofill, meta } = asm;
    const p = buildProposal(customer, sheet, bom, roi, roiAutofill, meta);
    setProposal(p);
    setDisplayTextOverrides({});
    setIncludeRoofLayout(options.includeRoofLayout);
    setRoofLayout(null);
    setRoofLayoutError(null);
    setRoofLayoutLoading(false);
    setActiveCustomerId(activeCustomer?.id ?? null);

    // ── Restore saved comments from customer record only ──
    // Never fall back to global localStorage — it may contain a different customer's comments.
    const savedComments: Record<string, string> =
      activeCustomer?.proposal?.bomComments ?? {};
    setBomComments(savedComments);

    // ── Persist all 4 artifacts to active customer, preserving any previously saved editedHtml ──
    if (activeCustomer) {
      const now = new Date().toISOString();

      const costingArtifact: CostingArtifact | null = sheet ? {
        sheetName:     sheet.name,
        savedAt:       sheet.savedAt,
        items:         sheet.items,
        showGst:       sheet.showGst,
        marginPercent: sheet.marginPercent,
        grandTotal:    sheet.grandTotal,
        totalGst:      sheet.totalGst ?? 0,
        systemSizeKw:  sheet.systemSizeKw,
      } : null;

      const bomArtifact: BomArtifact | null = bom.length > 0 ? {
        savedAt: now,
        rows:    bom,
      } : null;

      // roi from localStorage includes yearlyBreakdown at runtime even though
      // the local ProposalPreview type omits it; cast to satisfy customerStore type
      const roiArtifact: RoiArtifact | null = roi ? { savedAt: now, result: roi as any } : null;

      const proposalArtifact: ProposalArtifact = {
        refNumber:   p.refNumber,
        generatedAt: p.generatedAt,
        summary:     execSummary(p).slice(0, 200),
        bomComments: savedComments,
        editedHtml:    undefined,
        textOverrides: undefined,
        customSectionsBeforeBoq: normalizeCustomSectionsBeforeBoq(
          customSectionsBeforeBoq.length > 0
            ? customSectionsBeforeBoq
            : activeCustomer.proposal?.customSectionsBeforeBoq ?? [],
        ),
        proposalView: cloneProposalForStorage(p),
        includeRoofLayout: options.includeRoofLayout,
        roofLayout: options.includeRoofLayout ? (activeCustomer.proposal?.roofLayout ?? null) : null,
      };

      saveAllArtifacts(activeCustomer.id, costingArtifact, bomArtifact, roiArtifact, proposalArtifact);
      setSavedToCustomer(activeCustomer.master.name);

      // Sync all four artifacts to CRM backend so Admin/Ops/Finance/Management see the same data.
      const projectId = activeCustomer.master.crmProjectId;
      if (projectId) {
        if (costingArtifact) void syncProjectCosting(projectId, costingArtifact);
        if (bomArtifact) void syncProjectBom(projectId, bomArtifact);
        if (roiArtifact) void syncProjectRoi(projectId, roiArtifact);
        void syncProjectProposal(projectId, proposalArtifact);
      }
    }

    // Optionally generate the AI roof layout for this proposal so it can be included
    // as a section when requested.
    if (options.includeRoofLayout && activeCustomer?.master?.crmProjectId) {
      setRoofLayoutLoading(true);
      setRoofLayoutError(null);
      try {
        const crmProjectId = activeCustomer.master.crmProjectId;

        // If a manual layout was saved by the sales team, prefer it (image + corrected metrics).
        try {
          const manual = await fetchManualRoofLayout(crmProjectId);
          if (manual && typeof manual.layout_image_url === 'string' && manual.layout_image_url.trim()) {
            const rl: AiRoofLayoutResponse = {
              roof_area_m2: Number.isFinite(Number((manual as any).roof_area_m2)) ? Number((manual as any).roof_area_m2) : 0,
              usable_area_m2: Number.isFinite(Number((manual as any).usable_area_m2)) ? Number((manual as any).usable_area_m2) : 0,
              panel_count: Number.isFinite(Number((manual as any).panel_count)) ? Number((manual as any).panel_count) : 0,
              layout_image_url: String(manual.layout_image_url),
              source: (manual as any).source ?? 'MANUAL',
            };
            if ((manual as any).layout_image_3d_url != null && String((manual as any).layout_image_3d_url).trim()) {
              rl.layout_image_3d_url = String((manual as any).layout_image_3d_url);
            }
            if (typeof (manual as any).prefer_3d_for_proposal === 'boolean') {
              rl.prefer_3d_for_proposal = (manual as any).prefer_3d_for_proposal;
            }
            setRoofLayout(rl);
            setRoofLayoutLoading(false);
            return;
          }
        } catch {
          // ignore if no manual layout exists
        }

        const crmProject = await fetchCrmProjectForAiLayout(crmProjectId);

        let latitude: number | null =
          (crmProject.customer && (crmProject.customer as any).latitude != null
            ? Number((crmProject.customer as any).latitude)
            : activeCustomer.master.latitude ?? null);
        let longitude: number | null =
          (crmProject.customer && (crmProject.customer as any).longitude != null
            ? Number((crmProject.customer as any).longitude)
            : activeCustomer.master.longitude ?? null);
        let systemSizeKw: number | null =
          crmProject.systemCapacity != null
            ? Number(crmProject.systemCapacity)
            : activeCustomer.master.systemSizeKw ?? null;
        let panelWattage: number | null =
          crmProject.panelCapacityW != null
            ? Number(crmProject.panelCapacityW)
            : activeCustomer.master.panelWattage ?? null;

        if (
          latitude == null ||
          Number.isNaN(latitude) ||
          longitude == null ||
          Number.isNaN(longitude) ||
          systemSizeKw == null ||
          Number.isNaN(systemSizeKw) ||
          panelWattage == null ||
          Number.isNaN(panelWattage)
        ) {
          if (import.meta.env.DEV) {
            console.warn('AI roof layout skipped: missing required CRM data');
          }
          return;
        }

        const data = await generateAiRoofLayout({
          projectId: crmProject.id,
          latitude,
          longitude,
          systemSizeKw,
          panelWattage,
        });

        const roof = data?.roof_area_m2;
        const usable = data?.usable_area_m2;
        const panels = data?.panel_count;
        if (!Number.isFinite(roof) || !Number.isFinite(usable) || !Number.isFinite(panels)) {
          if (import.meta.env.DEV) {
            console.warn('AI roof layout response incomplete, skipping layout section');
          }
          return;
        }

        setRoofLayout({
          roof_area_m2: Number(roof),
          usable_area_m2: Number(usable),
          panel_count: Number(panels),
          layout_image_url:
            data?.layout_image_url && String(data.layout_image_url).trim() ? data.layout_image_url : '',
        });
        setRoofLayoutLoading(false);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to generate AI roof layout for proposal:', err);
        setRoofLayoutError('Roof layout could not be loaded. Please open AI Roof Layout and click “Save for proposal”, then regenerate the proposal.');
        setRoofLayoutLoading(false);
      }
    }
  };

  const handleRegenerate = () => {
    if (!canWrite) return;
    const ac = getActiveCustomer();
    if (ac) clearProposalArtifact(ac.id);
    setProposal(null);
    setDisplayTextOverrides({});
    setSavedToCustomer(null);
    setBomComments({});
    setIncludeRoofLayout(false);
    setRoofLayout(null);
    setRoofLayoutError(null);
    setRoofLayoutLoading(false);
    setIsEditing(false);
    setSaveStatus('idle');
    setCustomSectionsBeforeBoq([]);
  };

  const handleExportPdf = () => {
    if (!proposal) return;
    exportToPdf('proposal-print-root');
  };

  const handleExportDocx = async () => {
    if (!proposal) return;
    setExporting('docx');
    try {
      // Prefer live DOM overrides (captures any unsaved edits too);
      // fall back to last-saved overrides from the customer record.
      const liveMerged = extractMergedProposalTextOverrides(
        docBodyTopRef.current,
        docBodyBottomRef.current,
      );
      const liveOverrides =
        Object.keys(liveMerged).length > 0 ? liveMerged : undefined;
      const savedOverrides = getActiveCustomer()?.proposal?.textOverrides;
      const textOverrides = (liveOverrides && Object.keys(liveOverrides).length > 0)
        ? liveOverrides
        : savedOverrides;
      // DOCX export always uses the full BOM; collapse state affects only the on-screen HTML/PDF/Share view.
      await exportToDocx(
        proposal,
        bomComments,
        textOverrides,
        printRef.current ?? undefined,
        includeRoofLayout ? roofLayout : null,
        normalizeCustomSectionsBeforeBoq(customSectionsBeforeBoq),
      );
    } finally {
      setExporting(null);
    }
  };

  const handleOpenShareModal = () => {
    setShareModalOpen(true);
    setShareLink(null);
    setShareError(null);
    setShareLinkCopied(false);
    setShareUsePassword(false);
    setSharePassword('');
    setShareUseCustomValidity(false);
    setShareExpiryDate('');
  };

  const shareHtmlCacheRef = useRef<{ at: number; html: string } | null>(null);

  const handleCreateShare = async () => {
    if (!canWrite) return;
    const activeCustomer = getActiveCustomer();
    const projectId = activeCustomer?.master?.crmProjectId;
    if (!projectId) {
      setShareError('Link this proposal to a CRM project first (open from Customers).');
      return;
    }
    // Clone the proposal DOM so we can strip collapsed BOM sections before saving HTML
    let proposalHtml = '';
    const cache = shareHtmlCacheRef.current;
    const now = Date.now();
    if (cache && now - cache.at < 3000) {
      proposalHtml = cache.html;
    } else if (printRef.current) {
      const clone = printRef.current.cloneNode(true) as HTMLElement;
      // Remove elements marked for print/share hiding (buttons, edit-only controls)
      clone.querySelectorAll('.print-hide').forEach((n) => n.remove());
      // Ensure BOM notes are visible in the shared HTML (remove Tailwind's `hidden` utility on note paragraphs)
      clone.querySelectorAll<HTMLElement>('tr[data-bom-note] p').forEach((p) => {
        p.classList.remove('hidden');
      });
      proposalHtml = clone.innerHTML;
      shareHtmlCacheRef.current = { at: now, html: proposalHtml };
    }
    if (!proposalHtml.trim()) {
      setShareError('No proposal content to share.');
      return;
    }
    setShareCreating(true);
    setShareError(null);
    try {
      let expiresAt: string | undefined;
      if (shareUseCustomValidity && shareExpiryDate) {
        const d = new Date(shareExpiryDate);
        if (!Number.isNaN(d.getTime())) expiresAt = d.toISOString();
      }
      const data = await createProposalShare({
        projectId,
        proposalHtml,
        refNumber: proposal?.refNumber,
        password: shareUsePassword && sharePassword.trim() ? sharePassword.trim() : undefined,
        expiresAt,
      });
      if (!data?.token) {
        setShareError('Share created but no link was returned. Ensure the backend is deployed with the share API (VITE_API_BASE_URL must point to the CRM backend).');
        return;
      }
      const url = `${window.location.origin}/view/${data.token}`;
      setShareLink(url);
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setShareCreating(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink).then(() => {
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div>
      <div className="print-hide bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">📄</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">Proposal Generator</h1>
                <p className="mt-0.5 text-white/90 text-sm">
                  {proposal ? `Ref: ${proposal.refNumber}` : 'Generate a full proposal from your Costing Sheet, BOM & ROI data'}
                </p>
              </div>
            </div>
            {proposal && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
                {/* Edit toggle (Admin/Sales only) */}
                {canWrite && (
                  <button
                    onClick={() => setIsEditing((e) => !e)}
                    title={isEditing ? 'Exit edit mode' : 'Edit proposal'}
                    className={`w-full sm:w-auto flex items-center justify-center gap-1.5 border text-xs font-semibold px-3 py-2 rounded-lg transition-all min-h-[36px] ${
                      isEditing
                        ? 'bg-amber-400 border-amber-300 text-gray-900 hover:bg-amber-300'
                        : 'bg-white/20 hover:bg-white/30 border-white/40 text-white'
                    }`}
                  >
                    {isEditing ? '✏️ Editing…' : '✏️ Edit'}
                  </button>
                )}
                {/* Export buttons — full-width row on mobile so they match other buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleExportPdf}
                    disabled={!!exporting}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-60 min-h-[36px]"
                  >
                    {exporting === 'pdf'
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : '⬇'}
                    PDF
                  </button>
                  <button
                    onClick={handleExportDocx}
                    disabled={!!exporting}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-60 min-h-[36px]"
                  >
                    {exporting === 'docx'
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : '⬇'}
                    DOCX
                  </button>
                  {canWrite && (
                    <button
                      onClick={handleOpenShareModal}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all min-h-[36px]"
                      title="Share as link"
                    >
                      🔗 Share
                    </button>
                  )}
                </div>
                {canWrite && (
                  <button
                    onClick={handleRegenerate}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px]"
                  >
                    ← New Proposal
                  </button>
                )}
                {canWrite && (
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || !!exporting}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px] disabled:opacity-60 ${
                      saveStatus === 'saved'
                        ? 'bg-emerald-500 border-2 border-emerald-300 text-white'
                        : 'bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white'
                    }`}
                  >
                    {saveStatus === 'saving' && (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {saveStatus === 'saved' ? '✓ Saved' : '💾 Save'}
                  </button>
                )}
                {canWrite && proposal && (
                  <button
                    onClick={handleSaveAndClose}
                    disabled={saveStatus === 'saving' || !!exporting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-300 hover:bg-amber-400 text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px] disabled:opacity-60"
                  >
                    Save &amp; Close
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {!proposal ? (
            // key = activeCustomerId forces a full remount whenever the active
            // customer changes, ensuring useState initialises from the new customer.
            <CustomerForm
              key={activeCustomerId ?? 'no-customer'}
              onGenerate={handleGenerate}
              canGenerate={canWrite}
            />
          ) : (
            <div
              ref={printRef}
              id="proposal-print-root"
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                isEditing
                  ? 'border-amber-300 ring-2 ring-amber-200'
                  : 'border-primary-100'
              }`}
            >
              {/* Edit mode banner */}
              {isEditing && (
                <div className="print-hide bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 text-amber-800 text-[11px] sm:text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span>✏️</span>
                    <span>
                      Edit mode — click proposal text to edit inline, use the extra blocks above the <strong>Bill of Quantities</strong> (titles and rich text), and use the <strong>Bill of Quantities</strong> note fields below. Click <strong>Save</strong> when done (notes, media links, and body save together).
                    </span>
                  </div>
                  <p className="sm:ml-6 text-[10px] sm:text-[11px] text-amber-700">
                    Text changes are used in exports; layout, buttons, and collapse behaviour stay controlled by the app.
                  </p>
                </div>
              )}
              {/* Letterhead */}
              <div className="px-4 sm:px-8 py-6 sm:py-8" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
                {/* Top bar: logo left, ref/date right */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 pb-5 border-b border-white/20">
                  {/* Logo + company name */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-white rounded-xl p-2 shadow-lg">
                      <img
                        data-docx-image="logo"
                        src="/rayenna_logo.jpg"
                        alt="Rayenna Energy"
                        className="h-16 sm:h-[4.5rem] w-auto object-contain"
                        style={{ maxWidth: '160px' }}
                      />
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-base sm:text-lg tracking-tight drop-shadow leading-tight">Rayenna Energy Private Limited</p>
                      <p className="text-white/75 text-xs leading-relaxed mt-0.5">Door No. 3329/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi - 682019</p>
                      <p className="text-white/60 text-[10px] leading-relaxed mt-0.5">
                        Tel: +91 7907 369 304 · sales@rayenna.energy · www.rayennaenergy.com · GST: 32AANCR8677A1Z6
                      </p>
                    </div>
                  </div>
                  {/* Ref + Date */}
                  <div className="sm:text-right sm:flex-shrink-0 sm:max-w-[180px]">
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-0.5">Reference</p>
                    <p className="text-white font-mono text-sm font-semibold break-all">{proposal.refNumber}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mt-2 mb-0.5">Date</p>
                    <p className="text-white text-sm font-medium">
                      {new Date(proposal.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                {/* To: block */}
                </div>{/* end flex row */}

                {(proposal.customer.customerName || proposal.customer.contactPerson) && (
                  <div className="mt-5 pt-4 border-t border-white/20">
                    {(proposal.projectNumber != null || proposal.customerNumber) && (
                      <div className="mb-2 text-[11px] text-white/70 font-mono">
                        {proposal.projectNumber != null && (
                          <span>
                            Project #{proposal.projectNumber}
                            {proposal.customerNumber ? ' · ' : ''}
                          </span>
                        )}
                        {proposal.customerNumber && (
                          <span>Customer #{proposal.customerNumber}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-white/60 uppercase tracking-widest mb-1">To</p>
                    <p className="text-white font-bold text-base">{proposal.customer.customerName}</p>
                    {proposal.customer.contactPerson && <p className="text-white/80 text-sm">Attn: {proposal.customer.contactPerson}</p>}
                    {proposal.customer.location && <p className="text-white/70 text-xs mt-0.5">{proposal.customer.location}</p>}
                    {proposal.customer.phone && <p className="text-white/70 text-xs">📞 {proposal.customer.phone}</p>}
                    {proposal.customer.email && <p className="text-white/70 text-xs">✉ {formatEmailForDisplay(proposal.customer.email)}</p>}
                  </div>
                )}

                <div className="mt-5 pt-5 border-t border-white/20">
                  <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Proposal For</p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                    {proposal.systemSizeKw > 0 ? `${proposal.systemSizeKw} kW ` : ''}On-Grid Solar Power Plant
                  </h2>
                  {proposal.customer.location && (
                    <p className="text-white/80 mt-1 text-sm">{proposal.customer.location}</p>
                  )}
                </div>
              </div>

              {/* Two contentEditable regions: nested editors inside a parent contentEditable break image paste/insert in browsers. */}
              <div className="px-4 sm:px-8 py-6 sm:py-8">
                <ProposalTextOverridesContext.Provider value={displayTextOverrides}>
                <div
                  ref={docBodyTopRef}
                  contentEditable={canWrite && isEditing}
                  suppressContentEditableWarning
                  spellCheck={canWrite && isEditing}
                  style={canWrite && isEditing ? { outline: 'none', cursor: 'text' } : undefined}
                >
                {/* Saved-to-customer confirmation */}
                {savedToCustomer && (
                  <div className="print-hide mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-emerald-700">
                      <strong>✓ All 4 artifacts saved</strong> under <strong>{savedToCustomer}</strong> — Costing Sheet, BOM, ROI &amp; Proposal are now in the customer record.
                    </p>
                    {(() => {
                      const ac = getActiveCustomer();
                      return ac ? (
                        <Link to={`/customers/${ac.id}`} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold border border-emerald-300 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
                          View Customer →
                        </Link>
                      ) : null;
                    })()}
                  </div>
                )}

                <Divider />
                <ExecutiveSummaryBlock proposal={proposal} />
                <Divider />
                <AboutRayennaBlock />
                <Divider />
                <WhatWeOfferBlock />
                <Divider />
                <FinancialBenefitsBlock proposal={proposal} />
                <Divider />
                <EnvironmentalImpactBlock proposal={proposal} />
                {includeRoofLayout && (
                  <>
                    <Divider />
                    {roofLayout ? (
                      <RoofLayoutBlock
                        layout={roofLayout}
                        systemSizeKw={
                          proposal
                            ? ((proposal.roi?.inputs.systemSizeKw ?? 0) > 0
                                ? proposal.roi!.inputs.systemSizeKw
                                : proposal.systemSizeKw || proposal.roiAutofill?.systemSizeKw || 0)
                            : null
                        }
                      />
                    ) : roofLayoutLoading ? (
                      <div className="mb-8 pdf-section">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0f766e', height: '28px' }} />
                          <span className="text-lg leading-none">🛰️</span>
                          <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0f766e' }}>
                            Proposed Rooftop Solar Layout
                          </h2>
                        </div>
                        <div className="rounded-xl border border-secondary-200 bg-secondary-50 px-4 py-3 text-xs text-secondary-700">
                          Loading roof layout…
                        </div>
                      </div>
                    ) : roofLayoutError ? (
                      <div className="mb-8 pdf-section">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0f766e', height: '28px' }} />
                          <span className="text-lg leading-none">🛰️</span>
                          <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0f766e' }}>
                            Proposed Rooftop Solar Layout
                          </h2>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                          {roofLayoutError}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-8 pdf-section">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-1 rounded-full flex-shrink-0" style={{ background: '#0f766e', height: '28px' }} />
                          <span className="text-lg leading-none">🛰️</span>
                          <h2 className="text-base font-extrabold uppercase tracking-widest" style={{ color: '#0f766e' }}>
                            Proposed Rooftop Solar Layout
                          </h2>
                        </div>
                        <div className="rounded-xl border border-secondary-200 bg-secondary-50 px-4 py-3 text-xs text-secondary-700">
                          No roof layout found for this project yet.
                        </div>
                      </div>
                    )}
                  </>
                )}
                <Divider />
                <OurProcessBlock />
                <Divider />
                <ScopeOfWorkBlock proposal={proposal} />
                </div>
                <CustomSectionsBeforeBoq
                  sections={customSectionsBeforeBoq}
                  onChange={setCustomSectionsBeforeBoq}
                  readOnly={!canWrite || !isEditing}
                />
                <div
                  ref={docBodyBottomRef}
                  contentEditable={canWrite && isEditing}
                  suppressContentEditableWarning
                  spellCheck={canWrite && isEditing}
                  style={canWrite && isEditing ? { outline: 'none', cursor: 'text' } : undefined}
                >
                {proposal.bom.length > 0 && (
                  <>
                    <Divider />
                    <BOMGroupedTable
                      items={proposal.bom}
                      comments={bomComments}
                      onCommentsChange={(c) => {
                        setBomComments(c);
                      }}
                      collapsed={bomCollapsed}
                      setCollapsed={setBomCollapsed}
                      allCollapsed={bomAllCollapsed}
                      setAllCollapsed={setBomAllCollapsed}
                      notesEditable={canWrite && isEditing}
                    />
                  </>
                )}
                <Divider />
                <CommercialsBlock sheet={proposal.sheet} roi={proposal.roi} roiAutofill={proposal.roiAutofill} />
                <div className="print-hide">
                  <Divider />
                </div>
                <ListBlock title="Client Scope" items={CLIENT_SCOPE} />
                <Divider />
                <ListBlock title="Terms & Conditions" items={TERMS_AND_CONDITIONS} />
                <Divider />
                <ListBlock title="Service Details" items={SERVICE_DETAILS} />
                <Divider />
                <ListBlock title="Payment Terms" items={PAYMENT_TERMS} />
                <Divider />
                <AccountDetailsBlock />
                <Divider />
                <ListBlock title="Warranty" items={WARRANTY_TERMS} />
                <Divider />
                <ListBlock title="Material Delivery Period" items={DELIVERY_TERMS} />
                <Divider />
                <SectionBlock title="Closing Note" content={closingText(proposal)} />
                <Divider />
                <SectionBlock title="Subsidy Disclaimer and Payment Terms" content={SUBSIDY_DISCLAIMER_TEXT} />
                </div>
                </ProposalTextOverridesContext.Provider>
              </div>

              {/* Footer — Save + Export */}
              <div className="print-hide border-t border-primary-100 bg-gradient-to-br from-primary-50/30 to-transparent px-5 sm:px-8 py-4">
                {/* Meta line — visible on all screens, smaller on mobile */}
                <p className="text-[10px] sm:text-xs text-secondary-400 mb-3 sm:mb-0 sm:hidden">
                  Ref: {proposal.refNumber} · {new Date(proposal.generatedAt).toLocaleDateString('en-IN')}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: meta — desktop only */}
                  <p className="text-xs text-secondary-400 hidden sm:block">
                    Generated {new Date(proposal.generatedAt).toLocaleString('en-IN')} · {proposal.refNumber}
                    {savedToCustomer && saveStatus === 'saved' && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                        ✓ Saved to {savedToCustomer}
                      </span>
                    )}
                  </p>

                  {/* Right: actions — stack on mobile, row on sm+ */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
                    {/* Save button (bottom) */}
                    {canWrite && (
                      <button
                        onClick={handleSave}
                        disabled={saveStatus === 'saving' || !!exporting}
                        className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-all min-h-[44px] sm:min-h-0 ${
                          saveStatus === 'saved'
                            ? 'bg-emerald-500 text-white border border-emerald-400'
                            : 'bg-white text-primary-800 border border-primary-200 hover:bg-primary-50'
                        }`}
                      >
                        {saveStatus === 'saving' && (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {saveStatus === 'saved' ? '✓ Saved' : '💾 Save'}
                      </button>
                    )}

                    {/* Save & Close (bottom) */}
                    {canWrite && proposal && (
                      <button
                        onClick={handleSaveAndClose}
                        disabled={saveStatus === 'saving' || !!exporting}
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition-all min-h-[44px] sm:min-h-0 bg-amber-300 text-slate-900 border border-amber-400 hover:bg-amber-400"
                      >
                        Save &amp; Close
                      </button>
                    )}

                    {/* Export buttons row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportPdf}
                        disabled={!!exporting || saveStatus === 'saving'}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
                        style={{ background: '#374151' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                      >
                        {exporting === 'pdf'
                          ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : '⬇'}
                        Export PDF
                      </button>
                      <button
                        onClick={handleExportDocx}
                        disabled={!!exporting || saveStatus === 'saving'}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all disabled:opacity-60 min-h-[44px] sm:min-h-0"
                        style={{ background: '#374151' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                      >
                        {exporting === 'docx'
                          ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : '⬇'}
                        Export DOCX
                      </button>
                      {canWrite && (
                        <button
                          onClick={handleOpenShareModal}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-semibold text-white px-4 py-2.5 rounded-xl shadow transition-all min-h-[44px] sm:min-h-0"
                          style={{ background: '#374151' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1f2937')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#374151')}
                          title="Share as link"
                        >
                          🔗 Share
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      
      <ProposalShareModal
        open={shareModalOpen}
        shareLink={shareLink}
        shareCreating={shareCreating}
        shareError={shareError}
        shareUsePassword={shareUsePassword}
        sharePassword={sharePassword}
        shareUseCustomValidity={shareUseCustomValidity}
        shareExpiryDate={shareExpiryDate}
        shareLinkCopied={shareLinkCopied}
        onClose={() => setShareModalOpen(false)}
        onUsePasswordChange={setShareUsePassword}
        onPasswordChange={setSharePassword}
        onUseCustomValidityChange={setShareUseCustomValidity}
        onExpiryDateChange={setShareExpiryDate}
        onCreateShare={handleCreateShare}
        onCopyLink={handleCopyShareLink}
      />
    </div>
  );
}
