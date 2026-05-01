import type { ProposalCustomSectionBeforeBoq } from './customerStore';

type DocxNs = typeof import('docx');

function dataUriToArrayBuffer(dataUri: string): ArrayBuffer | null {
  const m = dataUri.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
  if (!m?.[2]) return null;
  try {
    const bin = atob(m[2].replace(/\s/g, ''));
    const buf = new ArrayBuffer(bin.length);
    const v = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i);
    return buf;
  } catch {
    return null;
  }
}

function bodyHtmlToParagraphs(html: string, docx: DocxNs): import('docx').Paragraph[] {
  const { Paragraph, TextRun, ImageRun } = docx;
  if (typeof document === 'undefined') return [];
  const host = document.createElement('div');
  host.innerHTML = html;
  const out: import('docx').Paragraph[] = [];

  const flushParagraph = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const t = text.replace(/\u00a0/g, ' ').trim();
    if (!t) return;
    out.push(
      new Paragraph({
        children: [new TextRun({ text: t, size: opts?.size ?? 22, bold: opts?.bold ?? false, color: '374151' })],
        spacing: { after: 80 },
      }),
    );
  };

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t) {
        out.push(
          new Paragraph({
            children: [new TextRun({ text: t, size: 22, color: '374151' })],
            spacing: { after: 60 },
          }),
        );
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'img') {
      const src = node.getAttribute('src');
      if (!src) return;
      if (src.startsWith('data:image')) {
        const buf = dataUriToArrayBuffer(src);
        if (buf && buf.byteLength > 0) {
          const u8 = new Uint8Array(buf.slice(0, 3));
          const imageType: 'png' | 'jpg' =
            u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xd8 ? 'jpg' : 'png';
          out.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: buf,
                  transformation: { width: 420, height: 315 },
                  type: imageType,
                }),
              ],
              spacing: { after: 120 },
            }),
          );
        }
      }
      return;
    }
    if (tag === 'p' || tag === 'div') {
      if (node.querySelector('img') || ['ul', 'ol'].some((t) => node.querySelector(t))) {
        node.childNodes.forEach(walk);
        return;
      }
      const t = node.innerText.replace(/\s+\n/g, '\n').trim();
      if (t) flushParagraph(t);
      return;
    }
    if (tag === 'h3' || tag === 'h4') {
      const t = node.innerText.trim();
      if (t) flushParagraph(t, { bold: true, size: 24 });
      return;
    }
    if (tag === 'blockquote') {
      const t = node.innerText.trim();
      if (t) flushParagraph(t);
      return;
    }
    if (tag === 'br') return;
    if (tag === 'ul' || tag === 'ol') {
      node.querySelectorAll<HTMLElement>(':scope > li').forEach((li) => {
        const t = li.innerText.trim();
        if (!t) return;
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: '• ', bold: true, size: 22, color: '0d1b3a' }),
              new TextRun({ text: t, size: 22, color: '374151' }),
            ],
            spacing: { after: 60 },
            indent: { left: 360 },
          }),
        );
      });
      return;
    }
    if (tag === 'li') return;
    node.childNodes.forEach(walk);
  };

  host.childNodes.forEach(walk);
  return out;
}

function sectionHeadingParagraph(title: string, docx: DocxNs): import('docx').Paragraph {
  const { Paragraph, TextRun, HeadingLevel, BorderStyle } = docx;
  const navy = '0d1b3a';
  return new Paragraph({
    children: [new TextRun({ text: title.trim() || 'Untitled', bold: true, size: 26, color: navy })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C7D2FE', space: 4 } },
  });
}

/** DOCX blocks inserted before the Bill of Quantities (links for video; optional poster image). */
export function proposalCustomSectionsToDocxBlocks(
  sections: ProposalCustomSectionBeforeBoq[] | undefined,
  posterBySectionId: Record<string, ArrayBuffer | undefined> | undefined,
  docx: DocxNs,
): import('docx').Paragraph[] {
  const { Paragraph, TextRun, ExternalHyperlink, ImageRun } = docx;
  if (!sections || sections.length === 0) return [];

  const blocks: import('docx').Paragraph[] = [];

  for (const s of sections) {
    blocks.push(sectionHeadingParagraph(s.title, docx));
    blocks.push(...bodyHtmlToParagraphs(s.bodyHtml, docx));

    if (s.mediaUrl?.trim()) {
      const label = s.mediaUrl.toLowerCase().includes('youtube') || s.mediaUrl.includes('youtu.be')
        ? 'Open video (YouTube)'
        : 'Open video / media file';
      blocks.push(
        new Paragraph({
          children: [
            new ExternalHyperlink({
              children: [new TextRun({ text: label, style: 'Hyperlink', size: 22 })],
              link: s.mediaUrl,
            }),
          ],
          spacing: { after: 120 },
        }),
      );
    }

    const poster = posterBySectionId?.[s.id];
    if (poster && poster.byteLength > 0) {
      try {
        const u8 = new Uint8Array(poster.slice(0, 3));
        const imageType: 'png' | 'jpg' =
          u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xd8 ? 'jpg' : 'png';
        blocks.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: poster,
                transformation: { width: 420, height: 236 },
                type: imageType,
              }),
            ],
            spacing: { after: 160 },
          }),
        );
      } catch {
        /* optional image */
      }
    }

    blocks.push(new Paragraph({ text: '', spacing: { after: 120 } }));
  }

  return blocks;
}
