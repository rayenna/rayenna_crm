import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  getActiveCustomer,
} from '../lib/customerStore';
import type { CostingArtifact, BomArtifact } from '../lib/customerStore';
import {
  CATEGORIES, CATEGORY_GST, CATEGORY_COLORS,
  DEFAULT_MARGIN,
  snapCategory, catAccentColor, deriveSystemSizeKw, sheetGrandTotal, sheetTotalGst, costingToBom, normalizeLineItemGst,
} from '../lib/costingConstants';
import type { LineItem, SavedSheet, StoredBom, RoiAutofill } from '../lib/costingConstants';
import { removeLocalStorageItem, setLocalStorageItem } from '../lib/safeLocalStorage';
import {
  canEditProposalArtifacts,
  getCurrentUserRole,
  fetchCostingTemplates,
  createCostingTemplate,
  deleteCostingTemplate,
} from '../lib/apiClient';
import { saveProjectArtifacts, PIPELINE_MARK_SYNCED } from '../lib/projectSavePipeline';
import { getWipKeysForCurrentUser } from '../lib/customerStore';
import type { FormValues, CostingTemplate } from '../costing/types';
import { EMPTY_ROW, BUILT_IN_TEMPLATES, loadTemplates } from '../costing/builtInTemplates';
import { loadSheets, persistSheets } from '../costing/costingStorage';
import { exportCostingXlsx, exportCostingCsv } from '../costing/exportCosting';
import { parseFile, downloadTemplate } from '../costing/costingImport';
import type { ImportRow } from '../costing/types';
import {
  SaveSheetModal,
  SaveTemplateModal,
  SavedSheetsPanel,
  TemplatesPanel,
  ImportModal,
} from '../costing/CostingModals';
import {
  CostingGroupedTable,
  GrandTotalCard,
  CategoryBreakdown,
} from '../costing/CostingTable';

export default function CostingSheet() {
  // Read active customer data synchronously before form init — avoids useEffect lag
  const _initCustomer = getActiveCustomer();
  const _initCosting  = _initCustomer?.costing;

  // Migrate any saved items that have old category keys (e.g. 'module' → 'pv-modules')
  const _migrateItems = (items: LineItem[]): LineItem[] =>
    items.map((r) => ({ ...r, category: snapCategory(r.category ?? 'others', r.itemName ?? '') }));

  const _startItems: LineItem[] =
    _initCosting?.items && _initCosting.items.length > 0
      ? _migrateItems(_initCosting.items)
      : [{ ...EMPTY_ROW }];

  // Keep a ref to the "current initial items" so CostingTable always has
  // the right categories even before useWatch fires on first render
  const initialItemsRef = useRef<LineItem[]>(_startItems);

  // Incremented on every reset() so CostingGroupedTable remounts cleanly
  const [resetKey, setResetKey] = useState(0);

  const { control, register, handleSubmit, formState: { errors: _errors }, reset, setValue } =
    useForm<FormValues>({ defaultValues: { items: _startItems } });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });
  const liveItems: LineItem[] = watchedItems ?? [];

  const [showGst, setShowGst]           = useState(_initCosting?.showGst ?? true);
  const [marginPercent, setMarginPercent] = useState(_initCosting?.marginPercent ?? DEFAULT_MARGIN);

  // Re-load if active customer changes (e.g. user switches customer in same session)
  React.useEffect(() => {
    const ac = getActiveCustomer();
    if (ac?.costing?.items && ac.costing.items.length > 0) {
      const migrated = _migrateItems(ac.costing.items);
      initialItemsRef.current = migrated;
      reset({ items: migrated });
      setResetKey((k) => k + 1);
      if (ac.costing.showGst !== undefined) setShowGst(ac.costing.showGst);
      if (ac.costing.marginPercent !== undefined) setMarginPercent(ac.costing.marginPercent);
    }
  }, [_initCustomer?.id]);

  // ── Template state ────────────────────────
  const [templates, setTemplates]               = useState<CostingTemplate[]>(loadTemplates);
  const [showTemplates, setShowTemplates]       = useState(false);
  const [showSaveModal, setShowSaveModal]       = useState(false);
  const [templateToast, setTemplateToast]       = useState<string | null>(null);

  // ── Saved Sheets state ────────────────────
  const [savedSheets, setSavedSheets]           = useState<SavedSheet[]>(loadSheets);
  const [showSheets, setShowSheets]             = useState(false);
  const [showSaveSheetModal, setShowSaveSheetModal] = useState(false);

  // ── Expand / Collapse All ─────────────────
  const [allCollapsed, setAllCollapsed]         = useState(true);

  const canEdit = canEditProposalArtifacts();
  const role = getCurrentUserRole();
  const canDeleteTemplates = role != null && String(role).toUpperCase() === 'ADMIN';

  // Load shared templates from backend (Sales/Admin) and merge with built-ins.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const dtos = await fetchCostingTemplates();
        if (cancelled) return;
        const shared: CostingTemplate[] = dtos.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? '',
          savedAt: t.savedAt,
          // Mark as non-built-in so they appear under "Your Saved Templates" and can be deleted (Admin only).
          isBuiltIn: false,
          // Items come from backend JSON; trust shape to match LineItem.
          items: (t.items as any[]) ?? [],
        }));
        setTemplates([...BUILT_IN_TEMPLATES, ...shared]);
      } catch (err) {
        // Non-blocking: if backend fails, fall back to built-ins only.
        if (import.meta.env.DEV) {
          console.error('Failed to load costing templates from backend', err);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setTemplateToast(msg);
    setTimeout(() => setTemplateToast(null), 2500);
  }, []);

  const handleSaveTemplate = useCallback((name: string, description: string) => {
    const itemsToSave = liveItems.filter((r) => r.itemName.trim());
    if (itemsToSave.length === 0) {
      showToast('Cannot save an empty template.');
      return;
    }

    // Persist in backend so templates are shared across Sales/Admin.
    void (async () => {
      try {
        const dto = await createCostingTemplate({
          name,
          description,
          items: itemsToSave,
        });

        const newTemplate: CostingTemplate = {
          id: dto.id,
          name: dto.name,
          description: dto.description ?? '',
          savedAt: dto.savedAt,
          isBuiltIn: false,
          items: (dto.items as any[]) ?? itemsToSave,
        };

        setTemplates((current) => {
          const builtIns = current.filter((t) => t.isBuiltIn);
          const userSaved = current.filter((t) => !t.isBuiltIn);
          return [...builtIns, newTemplate, ...userSaved];
        });

        setShowSaveModal(false);
        showToast(`Template "${name}" saved!`);
      } catch (err) {
        console.error('Failed to save costing template', err);
        showToast('Could not save template. Please try again.');
      }
    })();
  }, [liveItems, showToast]);

  const handleLoadTemplate = useCallback((t: CostingTemplate, mode: 'append' | 'replace') => {
    const migrated = _migrateItems(t.items);
    if (mode === 'replace') {
      initialItemsRef.current = migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }];
      reset({ items: migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }] });
      setResetKey((k) => k + 1);
    } else {
      const isOnlyBlank =
        liveItems.length === 1 &&
        !liveItems[0].itemName && !liveItems[0].quantity && !liveItems[0].unitCost;
      if (isOnlyBlank) remove(0);
      migrated.forEach((row) => append(row));
    }
    showToast(`"${t.name}" loaded`);
  }, [liveItems, reset, remove, append, showToast]);

  const handleDeleteTemplate = useCallback((id: string) => {
    // Only Admin should reach here (UI hides delete for others), but backend also enforces.
    void (async () => {
      try {
        await deleteCostingTemplate(id);
        setTemplates((current) => current.filter((t) => t.id !== id));
        showToast('Template deleted');
      } catch (err) {
        console.error('Failed to delete costing template', err);
        showToast('Could not delete template. Please try again.');
      }
    })();
  }, [showToast]);

  // Core save logic — called either directly (active customer) or from modal (no customer)
  const handleSaveSheet = useCallback(async (name: string, description: string) => {
    // Normalize GST: blank/missing → category default (5% or 18%) so labour etc. never show as 0%
    const validItems  = liveItems
      .filter((r) => r.itemName.trim())
      .map((r) => ({ ...r, gstPercent: normalizeLineItemGst(r) }));
    const grand       = sheetGrandTotal(validItems, showGst, marginPercent);
    const totalGst    = showGst ? sheetTotalGst(validItems, marginPercent) : 0;
    const sizeKw      = deriveSystemSizeKw(validItems);
    const now         = new Date().toISOString();

    // Overwrite existing sheet with same name, or create new entry
    const existingIdx = savedSheets.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    const id = existingIdx >= 0 ? savedSheets[existingIdx].id : `sheet_${Date.now()}`;

    const sheet: SavedSheet = {
      id,
      name,
      description,
      savedAt:       now,
      items:         validItems,
      showGst,
      marginPercent,
      grandTotal:    grand,
      totalGst,
      systemSizeKw:  sizeKw,
    };

    const updated =
      existingIdx >= 0
        ? savedSheets.map((s, i) => (i === existingIdx ? sheet : s))
        : [...savedSheets, sheet];

    setSavedSheets(updated);
    persistSheets(updated);

    // Auto-generate BOM and persist to localStorage for BOMSheet to pick up
    const bomRows = costingToBom(validItems);
    const storedBom: StoredBom = {
      sheetId:     id,
      sheetName:   name,
      generatedAt: now,
      rows:        bomRows,
    };
    const wip = getWipKeysForCurrentUser();
    // Refresh BOM-from-costing and clear any previous BOM overrides so GST and items
    // always match the latest costing sheet.
    setLocalStorageItem(wip.bomCosting, JSON.stringify(storedBom));
    removeLocalStorageItem(wip.bomOverrides);

    // Write ROI autofill so ROI Calculator picks up the latest values
    const roiAutofill: RoiAutofill = {
      source:       'costing-sheet',
      sourceName:   name,
      savedAt:      now,
      grandTotal:   grand,
      systemSizeKw: sizeKw,
    };
    setLocalStorageItem(wip.roiAutofill, JSON.stringify(roiAutofill));

    // Persist costing artifact and BOM to active customer (single source of truth = Costing Sheet).
    const activeCustomer = getActiveCustomer();
    if (activeCustomer) {
      const costingArtifact: CostingArtifact = {
        sheetName:     name,
        savedAt:       now,
        items:         validItems,
        showGst,
        marginPercent,
        grandTotal:    grand,
        totalGst,
        systemSizeKw:  sizeKw,
      };
      const bomArtifact: BomArtifact = { savedAt: now, rows: bomRows };

      const result = await saveProjectArtifacts(
        activeCustomer.id,
        {
          costing: costingArtifact,
          bom: bomArtifact,
        },
        PIPELINE_MARK_SYNCED,
      );

      if (!result.ok) {
        setShowSaveSheetModal(false);
        showToast(result.errorMessage ?? 'Server sync failed');
        return;
      }

      if (result.localOnly) {
        setShowSaveSheetModal(false);
        showToast(result.userMessage ?? 'Saved locally only — link this customer to a CRM project (Select Project) so costing syncs across devices.');
        return;
      }
    }

    setShowSaveSheetModal(false);
    showToast(activeCustomer
      ? `Sheet saved under ${activeCustomer.master.name} — BOM auto-generated!`
      : `Sheet "${name}" saved — BOM auto-generated!`);
  }, [liveItems, showGst, marginPercent, savedSheets, showToast]);

  const handleLoadSheet = useCallback((s: SavedSheet, mode: 'append' | 'replace') => {
    const migrated = _migrateItems(s.items);
    if (mode === 'replace') {
      initialItemsRef.current = migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }];
      reset({ items: migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }] });
      setResetKey((k) => k + 1);
    } else {
      const isOnlyBlank =
        liveItems.length === 1 &&
        !liveItems[0].itemName && !liveItems[0].quantity && !liveItems[0].unitCost;
      if (isOnlyBlank) remove(0);
      migrated.forEach((row) => append(row));
    }
    showToast(`"${s.name}" loaded`);
  }, [liveItems, reset, remove, append, showToast]);

  const handleDeleteSheet = useCallback((id: string) => {
    const updated = savedSheets.filter((s) => s.id !== id);
    setSavedSheets(updated);
    persistSheets(updated);
    showToast('Sheet deleted');
  }, [savedSheets, showToast]);

  // ── Import state ──────────────────────────
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows]     = useState<ImportRow[] | null>(null);
  const [importError, setImportError]   = useState<string | null>(null);
  const [importing, setImporting]       = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';
    setImportError(null);
    setImporting(true);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        setImportError('No data rows found. Make sure the file has a header row and at least one data row.');
      } else {
        setImportRows(rows);
      }
    } catch {
      setImportError('Could not read the file. Please use .xlsx, .xls, or .csv format.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportConfirm = (mode: 'append' | 'replace') => {
    if (!importRows) return;
    const valid = importRows
      .filter((r) => !r.error)
      .map((r): LineItem => {
        const cat = snapCategory(r.category, r.itemName);
        return {
          category:      cat,
          itemName:      r.itemName,
          specification: r.specification ?? '',
          quantity:      r.quantity,
          unitCost:      r.unitCost,
          gstPercent:    String(CATEGORY_GST[cat]),
        };
      });

    if (mode === 'replace') {
      initialItemsRef.current = valid.length > 0 ? valid : [{ ...EMPTY_ROW }];
      reset({ items: valid.length > 0 ? valid : [{ ...EMPTY_ROW }] });
      setResetKey((k) => k + 1);
    } else {
      // Remove the single blank placeholder row if it's the only row and empty
      const currentItems = liveItems;
      const isOnlyBlank =
        currentItems.length === 1 &&
        !currentItems[0].itemName &&
        !currentItems[0].quantity &&
        !currentItems[0].unitCost;
      if (isOnlyBlank) remove(0);
      valid.forEach((row) => append(row));
    }
    setImportRows(null);
  };

  const onSubmit = () => {
    // If a customer is active, overwrite their sheet directly — no modal needed
    const ac = getActiveCustomer();
    if (ac) {
      handleSaveSheet(ac.master.name, '');
    } else {
      setShowSaveSheetModal(true);
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Import preview modal */}
      {importRows && (
        <ImportModal
          rows={importRows}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportRows(null)}
        />
      )}

      {/* Save sheet modal — only shown when no active customer */}
      {showSaveSheetModal && (
        <SaveSheetModal
          itemCount={liveItems.filter((r) => r.itemName.trim()).length}
          defaultName={savedSheets.length > 0 ? savedSheets[savedSheets.length - 1].name : ''}
          onSave={handleSaveSheet}
          onCancel={() => setShowSaveSheetModal(false)}
        />
      )}

      {/* Saved sheets panel */}
      {showSheets && (
        <SavedSheetsPanel
          sheets={savedSheets}
          onLoad={handleLoadSheet}
          onDelete={handleDeleteSheet}
          onClose={() => setShowSheets(false)}
        />
      )}

      {/* Save template modal */}
      {showSaveModal && (
        <SaveTemplateModal
          itemCount={liveItems.filter((r) => r.itemName.trim()).length}
          onSave={handleSaveTemplate}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {/* Templates panel */}
      {showTemplates && (
        <TemplatesPanel
          templates={templates}
          onLoad={handleLoadTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowTemplates(false)}
          canDeleteTemplates={canDeleteTemplates}
        />
      )}

      {/* Toast notification */}
      {templateToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-pulse">
          ✓ {templateToast}
        </div>
      )}

      <div>
        {/* Page card */}
        <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
          {/* Header strip */}
          <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">
                  📊
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                    Costing Sheet
                  </h1>
                  <p className="mt-0.5 text-white/90 text-sm">
                    Add line items below. Total per row is calculated automatically.
                  </p>
                </div>
              </div>

              {/* Header action buttons — two rows: primary | secondary/export (hidden for read-only: Ops/Finance/Management) */}
              {canEdit && (
              <div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">

                {/* Row 1 — primary actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* GST toggle */}
                  <button
                    type="button"
                    onClick={() => setShowGst((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors min-h-[36px] ${
                      showGst
                        ? 'bg-white/25 text-white border-white/50'
                        : 'bg-white/10 text-white/70 border-white/25 hover:bg-white/20'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full inline-block ${showGst ? 'bg-emerald-300' : 'bg-white/40'}`} />
                    GST {showGst ? 'ON' : 'OFF'}
                  </button>

                  {/* Saved Sheets button */}
                  <button
                    type="button"
                    onClick={() => setShowSheets(true)}
                    className="flex items-center gap-1.5 text-xs text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/40 px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                  >
                    📂 Saved Sheets
                    {savedSheets.length > 0 && (
                      <span className="bg-sky-400 text-primary-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {savedSheets.length}
                      </span>
                    )}
                  </button>

                  {/* Templates button */}
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 text-xs text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/40 px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                  >
                    📋 Templates
                    {templates.filter((t) => !t.isBuiltIn).length > 0 && (
                      <span className="bg-yellow-400 text-primary-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {templates.filter((t) => !t.isBuiltIn).length}
                      </span>
                    )}
                  </button>

                  {/* Import Excel */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 text-xs text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/40 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 min-h-[36px]"
                  >
                    {importing ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : '📥'}
                    Import Excel
                  </button>

                  {/* Quick Save (top-right) */}
                  <button
                    type="button"
                    onClick={onSubmit}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all min-h-[36px]"
                  >
                    💾 Save Sheet
                  </button>
                </div>

                {/* Row 2 — secondary / export actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Save as template */}
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    disabled={liveItems.filter((r) => r.itemName.trim()).length === 0}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 min-h-[32px]"
                  >
                    💾 Save as Template
                  </button>

                  {/* Export XLSX */}
                  <button
                    type="button"
                    onClick={() => {
                      const name = savedSheets.length > 0
                        ? savedSheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0].name
                        : 'Costing_Sheet';
                      void exportCostingXlsx(liveItems.filter((r) => r.itemName.trim()), name, showGst, marginPercent);
                    }}
                    disabled={liveItems.filter((r) => r.itemName.trim()).length === 0}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 min-h-[32px]"
                  >
                    📤 XLSX
                  </button>

                  {/* Export CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      const name = savedSheets.length > 0
                        ? savedSheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0].name
                        : 'Costing_Sheet';
                      exportCostingCsv(liveItems.filter((r) => r.itemName.trim()), name, showGst, marginPercent);
                    }}
                    disabled={liveItems.filter((r) => r.itemName.trim()).length === 0}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 min-h-[32px]"
                  >
                    📤 CSV
                  </button>

                  {/* Excel Template download */}
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium min-h-[32px]"
                  >
                    ⬇ Template
                  </button>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

            {/* Active customer banner */}
            {(() => {
              const ac = getActiveCustomer();
              return ac ? (
                <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-sky-700">
                    <span className="font-semibold">Active customer:</span> {ac.master.name}
                    {ac.master.location ? ` · ${ac.master.location}` : ''}
                    {ac.costing && <span className="ml-2 text-emerald-600 font-medium">· Costing saved ✓</span>}
                  </p>
                  <Link to="/" className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap transition-colors">
                    View Dashboard →
                  </Link>
                </div>
              ) : (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-700">No active customer selected. Save Sheet will still work, but won't be linked to a customer record.</p>
                  <Link to="/customers" className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
                    Select Customer →
                  </Link>
                </div>
              );
            })()}

            {/* Import error banner */}
            {importError && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm flex items-start gap-2">
                <span className="text-base flex-shrink-0">⚠</span>
                <div>
                  <p className="font-semibold">Import failed</p>
                  <p className="text-xs mt-0.5">{importError}</p>
                </div>
                <button
                  onClick={() => setImportError(null)}
                  className="ml-auto text-amber-600 hover:text-amber-800 text-lg leading-none flex-shrink-0"
                >×</button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* ── Expand / Collapse All bar ── */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-secondary-400 font-medium">
                  {fields.length} item{fields.length !== 1 ? 's' : ''} across {
                    [...new Set(fields.map((_, i) => initialItemsRef.current[i]?.category || liveItems[i]?.category || 'others'))].length
                  } categor{[...new Set(fields.map((_, i) => initialItemsRef.current[i]?.category || liveItems[i]?.category || 'others'))].length !== 1 ? 'ies' : 'y'}
                </span>
                <button
                  type="button"
                  onClick={() => setAllCollapsed((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                  style={allCollapsed
                    ? { background: '#0d1b3a', color: 'white', borderColor: '#0d1b3a' }
                    : { background: 'white', color: '#0d1b3a', borderColor: '#0d1b3a40' }
                  }
                >
                  <span>{allCollapsed ? '▶▶' : '▼▼'}</span>
                  {allCollapsed ? 'Expand All' : 'Collapse All'}
                </button>
              </div>

              {/* ── Grouped costing table ── */}
              <CostingGroupedTable
                fields={fields}
                control={control}
                register={register}
                setValue={setValue}
                remove={remove}
                append={append}
                showGst={showGst}
                marginPercent={marginPercent}
                itemCategories={fields.map((_, i) =>
                  initialItemsRef.current[i]?.category || liveItems[i]?.category || 'others'
                )}
                liveItems={liveItems.length > 0 ? liveItems : initialItemsRef.current}
                allCollapsed={allCollapsed}
                resetSignal={resetKey}
                canEdit={canEdit}
              />

              {/* Grand total summary */}
              {(liveItems.length > 0 ? liveItems : initialItemsRef.current).filter((r) => r.itemName?.trim()).length > 0 && (
                <GrandTotalCard
                  items={liveItems.length > 0 ? liveItems : initialItemsRef.current}
                  showGst={showGst}
                  marginPercent={marginPercent}
                />
              )}

              {/* Actions — hidden for read-only (Ops/Finance/Management); only Expand/Collapse + View Dashboard remain */}
              {canEdit && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const accent = catAccentColor(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => append({ ...EMPTY_ROW, category: cat.value, gstPercent: String(CATEGORY_GST[cat.value]) })}
                        className="flex items-center gap-1 text-xs font-medium transition-colors px-2.5 py-1.5 rounded-lg border hover:opacity-80"
                        style={{ color: accent, borderColor: `${accent}50`, background: `${accent}08` }}
                      >
                        <span className="text-sm leading-none">+</span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Editable Margin % */}
                  <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <label className="text-xs font-semibold text-yellow-700 whitespace-nowrap">Margin %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      value={marginPercent}
                      onChange={(e) => {
                        const raw = parseFloat(e.target.value);
                        const v = Number.isFinite(raw) ? raw : 0;
                        const clamped = Math.max(0, Math.min(100, v));
                        setMarginPercent(Math.round(clamped * 1000) / 1000);
                      }}
                      className="w-16 bg-transparent text-sm font-bold text-yellow-800 text-right focus:outline-none tabular-nums"
                    />
                    <span className="text-xs text-yellow-600">%</span>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear all rows?')) {
                          remove(fields.map((_, i) => i));
                          append({ ...EMPTY_ROW });
                        }
                      }}
                      className="flex-1 sm:flex-none text-sm text-secondary-500 hover:text-secondary-700 transition-colors px-4 py-2.5 rounded-xl hover:bg-secondary-100 border border-secondary-200 min-h-[44px]"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none text-sm text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl min-h-[44px]"
                      style={{ background: '#0d1b3a' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
                    >
                      Save Sheet
                    </button>
                  </div>
                </div>
              </div>
              )}
            </form>

            {/* Category breakdown */}
            <CategoryBreakdown items={liveItems} />

            {/* How to import — help panel */}
            <div className="mt-8 bg-gradient-to-br from-primary-50/30 to-transparent border-t border-primary-100 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-secondary-600 mb-4">How to import from Excel</h3>
              <ol className="space-y-4">

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">1</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Click{' '}
                    <span className="inline-flex items-center gap-0.5 bg-secondary-100 border border-secondary-200 rounded px-1.5 py-0.5 font-semibold text-secondary-700 whitespace-nowrap">
                      ⬇ Template
                    </span>
                    {' '}to download a ready-made Excel template. It has two sheets: <em className="font-semibold not-italic text-secondary-600">Costing Sheet</em> (sample data covering all 11 categories) and <em className="font-semibold not-italic text-secondary-600">Category Reference</em> (valid keys + GST rates). Replace the sample rows with your own data.
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">2</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Fill in your data. Accepted columns:
                    <span className="block mt-1 flex flex-wrap gap-1">
                      {['Category', 'Item Name', 'Specification', 'Quantity', 'Unit Cost'].map((col) => (
                        <span key={col} className={`inline-block border rounded px-1.5 py-0.5 font-semibold text-[11px] ${col === 'Specification' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>
                          {col}{col === 'Specification' ? ' *' : ''}
                        </span>
                      ))}
                    </span>
                    <span className="block mt-1">Column order doesn't matter. <em className="text-emerald-600 not-italic font-medium">* Specification is optional but flows directly into the BOM — saves manual re-entry.</em></span>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">3</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Valid categories (use the exact key value in your Excel):
                    <span className="block mt-1 flex flex-wrap gap-1">
                      {CATEGORIES.map((c) => (
                        <span key={c.value} className={`inline-block border rounded px-1.5 py-0.5 font-semibold text-[11px] ${CATEGORY_COLORS[c.value]}`}>
                          {c.value}
                        </span>
                      ))}
                    </span>
                    <span className="block mt-1">Any unrecognised value defaults to <em className="font-semibold not-italic text-secondary-600">others</em>. Common keywords (e.g. "panel", "mount", "earth") are also auto-matched.</span>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">4</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Click{' '}
                    <span className="inline-flex items-center gap-0.5 bg-secondary-100 border border-secondary-200 rounded px-1.5 py-0.5 font-semibold text-secondary-700 whitespace-nowrap">
                      📥 Import Excel
                    </span>
                    , review the preview, then choose{' '}
                    <em className="font-semibold not-italic text-secondary-600">Append</em>
                    {' '}(add to existing rows) or{' '}
                    <em className="font-semibold not-italic text-secondary-600">Replace all rows</em>.
                  </div>
                </li>

              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
