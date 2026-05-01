import {
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { ProposalCustomSectionBeforeBoq } from '../lib/customerStore';
import {
  newCustomSectionId,
  PE_MANAGED_BEFORE_BOQ,
  PE_MANAGED_SECTION_ATTR,
  youtubeEmbedFromUrl,
  isMp4MediaUrl,
} from '../lib/proposalCustomSections';
import {
  sanitizeProposalCustomBodyHtml,
  isSafeDataImageSrc,
  preCleanRichPasteHtml,
} from '../lib/sanitizeProposalCustomHtml';

/** Resize / JPEG-compress so pasted photos stay under sanitiser limits and save reliably. */
async function compressImageFileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('decode'));
      im.src = blobUrl;
    });

    let { width, height } = img;
    const maxW = 1600;
    if (width > maxW) {
      height = Math.round((height * maxW) / width);
      width = maxW;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    let q = 0.88;
    let dataUrl = canvas.toDataURL('image/jpeg', q);
    while (dataUrl.length > 850_000 && q > 0.45) {
      q -= 0.06;
      dataUrl = canvas.toDataURL('image/jpeg', q);
    }
    return isSafeDataImageSrc(dataUrl) ? dataUrl : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

const IMG_WIDTH_SM = 260;
const IMG_WIDTH_MD = 380;
const IMG_WIDTH_LG = 560;

function highlightSelectedImg(root: HTMLElement | null, img: HTMLImageElement | null): void {
  if (!root) return;
  root.querySelectorAll('img').forEach((el) => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  });
  if (img && root.contains(img)) {
    img.style.outline = '2px solid #2563eb';
    img.style.outlineOffset = '2px';
  }
}

function insertHtmlIntoCaret(el: HTMLElement, html: string): void {
  el.focus();
  try {
    document.execCommand('insertHTML', false, html);
    return;
  } catch {
    /* fall through */
  }
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const anchor = sel.anchorNode;
    const contained =
      anchor &&
      el.contains(anchor.nodeType === Node.TEXT_NODE ? (anchor.parentNode as Node) : anchor);
    if (contained) {
      try {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = range.createContextualFragment(html);
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      } catch {
        /* fall through */
      }
    }
  }
  el.insertAdjacentHTML('beforeend', html);
}

function CustomBodyEditor({
  html,
  readOnly,
  onCommit,
}: {
  html: string;
  readOnly: boolean;
  onCommit: (next: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  /** Bumps when image selection changes so the toolbar re-renders (refs alone do not). */
  const [imgToolbarRev, setImgToolbarRev] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || readOnly) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== html) {
      el.innerHTML = html;
      selectedImgRef.current = null;
      highlightSelectedImg(el, null);
      setImgToolbarRev((n) => n + 1);
    }
  }, [html, readOnly]);

  const insertImageFromFile = async (file: File) => {
    const dataUrl = await compressImageFileToDataUrl(file);
    if (!dataUrl || !ref.current) return;
    const imgHtml = `<img src="${dataUrl}" alt="" width="${IMG_WIDTH_MD}" />`;
    insertHtmlIntoCaret(ref.current, imgHtml);
    onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
  };

  const applyImageWidth = (mode: 'sm' | 'md' | 'lg' | 'full') => {
    const img = selectedImgRef.current;
    const root = ref.current;
    if (!img || !root?.contains(img)) return;
    if (mode === 'full') {
      img.removeAttribute('width');
      img.removeAttribute('height');
    } else {
      const w = mode === 'sm' ? IMG_WIDTH_SM : mode === 'md' ? IMG_WIDTH_MD : IMG_WIDTH_LG;
      img.setAttribute('width', String(w));
      img.removeAttribute('height');
    }
    highlightSelectedImg(root, img);
    onCommit(sanitizeProposalCustomBodyHtml(root.innerHTML));
    setImgToolbarRev((n) => n + 1);
  };

  const onEditorClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const root = ref.current;
    if (!root) return;
    const t = e.target;
    if (t instanceof HTMLImageElement && root.contains(t)) {
      selectedImgRef.current = t;
      highlightSelectedImg(root, t);
      setImgToolbarRev((n) => n + 1);
    } else if (t instanceof Node && root.contains(t)) {
      selectedImgRef.current = null;
      highlightSelectedImg(root, null);
      setImgToolbarRev((n) => n + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const dt = e.clipboardData;
    if (!dt || !ref.current) return;

    const { files } = dt;
    if (files?.length) {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith('image/')) {
          e.preventDefault();
          e.stopPropagation();
          void insertImageFromFile(f);
          return;
        }
      }
    }

    const items = dt.items;
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            e.stopPropagation();
            void insertImageFromFile(f);
          }
          return;
        }
      }
    }

    const htmlRaw = dt.getData('text/html');
    const plain = dt.getData('text/plain') ?? '';

    if (htmlRaw && htmlRaw.trim().length > 0) {
      const cleaned = sanitizeProposalCustomBodyHtml(preCleanRichPasteHtml(htmlRaw));
      const probe = document.createElement('div');
      probe.innerHTML = cleaned;
      const textLen = (probe.textContent ?? '').replace(/\u00a0/g, ' ').trim().length;
      const meaningful =
        textLen > 0 ||
        !!probe.querySelector('img,table,ul,ol,a,h3,h4,blockquote');
      if (meaningful) {
        e.preventDefault();
        e.stopPropagation();
        insertHtmlIntoCaret(ref.current, cleaned);
        onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
        return;
      }
    }

    if (plain.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const escaped = plain
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const lines = escaped.split(/\r?\n/);
      const asHtml = lines.map((line) => `<p>${line.length ? line : '<br />'}</p>`).join('');
      insertHtmlIntoCaret(ref.current, asHtml);
      onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
    }
  };

  const onFilePick = (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    ev.target.value = '';
    if (f) void insertImageFromFile(f);
  };

  if (readOnly) {
    return (
      <div
        className="text-sm text-secondary-800 leading-relaxed space-y-2 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-semibold [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-secondary-200 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-secondary-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-secondary-50"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 print-hide">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFilePick} />
        <button
          type="button"
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50"
          onClick={() => fileRef.current?.click()}
        >
          Insert image
        </button>
        <span className="text-[10px] text-secondary-500">Paste rich text or images</span>
      </div>

      {selectedImgRef.current && ref.current?.contains(selectedImgRef.current) ? (
        <div
          key={imgToolbarRev}
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50/80 px-2 py-1.5 print-hide"
        >
          <span className="text-[10px] font-semibold text-secondary-600 mr-1">Image width:</span>
          {(['sm', 'md', 'lg', 'full'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="text-[10px] font-semibold px-2 py-0.5 rounded border border-secondary-300 bg-white text-secondary-800 hover:bg-secondary-50"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => applyImageWidth(mode)}
            >
              {mode === 'sm' ? 'S' : mode === 'md' ? 'M' : mode === 'lg' ? 'L' : 'Full'}
            </button>
          ))}
          <span className="text-[9px] text-secondary-500 ml-1 hidden sm:inline">
            S/M/L = px · Full = container width
          </span>
        </div>
      ) : null}

      <div
        ref={ref}
        className="min-h-[120px] rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm text-secondary-800 focus:outline-none focus:ring-2 focus:ring-primary-400/40 [&_a]:text-blue-600 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:border [&_img]:border-secondary-200 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_td]:border [&_td]:border-secondary-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-secondary-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-secondary-50"
        contentEditable
        suppressContentEditableWarning
        onMouseDown={(ev) => ev.stopPropagation()}
        onClick={onEditorClick}
        onPaste={onPaste}
        onBlur={() => {
          highlightSelectedImg(ref.current, null);
          selectedImgRef.current = null;
          setImgToolbarRev((n) => n + 1);
          if (ref.current) onCommit(sanitizeProposalCustomBodyHtml(ref.current.innerHTML));
        }}
      />
    </div>
  );
}

function MediaPreview({ url }: { url: string }) {
  const embed = youtubeEmbedFromUrl(url);
  if (embed) {
    return (
      <div className="mt-3 max-w-xl rounded-lg overflow-hidden border border-secondary-200 bg-black/5 aspect-video">
        <iframe
          title="Embedded video"
          src={embed}
          className="w-full h-full min-h-[200px]"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  if (isMp4MediaUrl(url)) {
    return (
      <div className="mt-3 max-w-xl rounded-lg overflow-hidden border border-secondary-200 bg-black">
        <video controls className="w-full max-h-[360px]" src={url} />
      </div>
    );
  }
  return (
    <p className="mt-2 text-xs text-amber-700">
      Use a supported <strong>https</strong> YouTube link or a direct <strong>.mp4</strong> URL.
    </p>
  );
}

type Props = {
  sections: ProposalCustomSectionBeforeBoq[];
  onChange: (next: ProposalCustomSectionBeforeBoq[]) => void;
  readOnly: boolean;
};

export function CustomSectionsBeforeBoq({ sections, onChange, readOnly }: Props) {
  const [mediaPanelOpen, setMediaPanelOpen] = useState<Record<string, boolean>>({});

  const updateAt = (index: number, patch: Partial<ProposalCustomSectionBeforeBoq>) => {
    const next = sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    const t = next[index]!;
    next[index] = next[j]!;
    next[j] = t;
    onChange(next);
  };

  const removeAt = (index: number) => {
    const id = sections[index]?.id;
    onChange(sections.filter((_, i) => i !== index));
    if (id) {
      setMediaPanelOpen((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }
  };

  const addSection = () => {
    const id = newCustomSectionId();
    onChange([
      ...sections,
      {
        id,
        title: '',
        bodyHtml: '',
      },
    ]);
  };

  const showMediaPanel = (s: ProposalCustomSectionBeforeBoq) => {
    if (readOnly) return !!(s.mediaUrl?.trim() || s.mediaPosterUrl?.trim());
    return !!(s.mediaUrl?.trim() || s.mediaPosterUrl?.trim() || mediaPanelOpen[s.id]);
  };

  if (sections.length === 0 && readOnly) {
    return null;
  }

  return (
    <div
      className="mb-8 pdf-section"
      {...{ [PE_MANAGED_SECTION_ATTR]: PE_MANAGED_BEFORE_BOQ }}
      contentEditable={false}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="space-y-8">
        {sections.map((s, index) => (
          <div key={s.id} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className="w-1 rounded-full flex-shrink-0 mt-1"
                  style={{ background: '#0369a1', height: '28px' }}
                />
                <span className="text-lg leading-none flex-shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  {readOnly ? (
                    <h2
                      className="text-base font-extrabold uppercase tracking-widest"
                      style={{ color: '#0369a1' }}
                    >
                      {(s.title || '').trim() || 'Untitled'}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      value={s.title}
                      onChange={(e) => updateAt(index, { title: e.target.value })}
                      className="w-full text-base font-extrabold uppercase tracking-widest bg-transparent border-b-2 border-secondary-200 pb-1 outline-none focus:border-primary-500 placeholder:text-secondary-400 placeholder:font-semibold"
                      style={{ color: '#0369a1' }}
                      placeholder="Section title"
                    />
                  )}
                </div>
              </div>
              {!readOnly && (
                <div className="flex flex-wrap gap-2 print-hide sm:pt-0.5">
                  <button
                    type="button"
                    className="text-xs font-semibold px-2 py-1 rounded border border-secondary-300 bg-white hover:bg-secondary-50"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold px-2 py-1 rounded border border-secondary-300 bg-white hover:bg-secondary-50"
                    onClick={() => move(index, 1)}
                    disabled={index === sections.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold px-2 py-1 rounded border border-red-200 text-red-700 bg-white hover:bg-red-50"
                    onClick={() => removeAt(index)}
                  >
                    Remove section
                  </button>
                </div>
              )}
            </div>

            <CustomBodyEditor
              html={s.bodyHtml}
              readOnly={readOnly}
              onCommit={(bodyHtml) => updateAt(index, { bodyHtml })}
            />

            {!readOnly && !showMediaPanel(s) ? (
              <div className="mt-3 print-hide">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-700 hover:text-primary-900 underline-offset-2 hover:underline"
                  onClick={() => setMediaPanelOpen((prev) => ({ ...prev, [s.id]: true }))}
                >
                  + Add video or media link
                </button>
              </div>
            ) : null}

            {showMediaPanel(s) ? (
              <div className="mt-4 rounded-lg border border-secondary-200 bg-white px-3 py-3 space-y-2">
                {!readOnly ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 print-hide">
                    <span className="text-xs font-medium text-secondary-700">Video or media link</span>
                    <button
                      type="button"
                      className="text-xs text-secondary-600 hover:text-secondary-900 underline"
                      onClick={() => {
                        updateAt(index, { mediaUrl: undefined, mediaPosterUrl: undefined });
                        setMediaPanelOpen((prev) => ({ ...prev, [s.id]: false }));
                      }}
                    >
                      Remove media
                    </button>
                  </div>
                ) : null}
                {readOnly ? (
                  s.mediaUrl ? (
                    <>
                      <a
                        href={s.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 break-all"
                      >
                        {s.mediaUrl}
                      </a>
                      {s.mediaPosterUrl ? (
                        <img
                          src={s.mediaPosterUrl}
                          alt=""
                          className="mt-2 max-w-md rounded-lg border border-secondary-200"
                        />
                      ) : null}
                      <MediaPreview url={s.mediaUrl} />
                    </>
                  ) : s.mediaPosterUrl ? (
                    <img
                      src={s.mediaPosterUrl}
                      alt=""
                      className="max-w-md rounded-lg border border-secondary-200"
                    />
                  ) : null
                ) : (
                  <>
                    <input
                      type="url"
                      value={s.mediaUrl ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateAt(index, { mediaUrl: v || undefined });
                      }}
                      placeholder="YouTube or https://…/video.mp4"
                      className="w-full rounded border border-secondary-200 px-2 py-1.5 text-xs"
                    />
                    {s.mediaUrl ? <MediaPreview url={s.mediaUrl} /> : null}
                    <input
                      type="url"
                      value={s.mediaPosterUrl ?? ''}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateAt(index, { mediaPosterUrl: v || undefined });
                      }}
                      placeholder="Optional poster image URL (https)"
                      className="w-full rounded border border-secondary-200 px-2 py-1.5 text-xs"
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-6 print-hide">
          <button
            type="button"
            onClick={addSection}
            className="text-xs font-semibold px-4 py-2 rounded-xl border-2 border-primary-200 bg-primary-50 text-primary-900 hover:bg-primary-100"
          >
            + Add section
          </button>
        </div>
      )}
    </div>
  );
}
