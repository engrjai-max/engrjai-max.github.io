// ============================================================
// docx-export.js — Word (.docx) export using the docx.js library
// (loaded globally via <script> in index.html as `window.docx`,
// with FileSaver.js providing `saveAs`)
// ============================================================

import { state } from './state.js?v=6';
import { formatDate } from './render.js?v=7';

const MAX_IMG_WIDTH = 140; // px, matches roughly the PDF's max-height:70px photos

// ── Fetch an image (URL or base64 data URL) and prep it for ImageRun ──
async function loadImageForDocx(src) {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const buf  = await blob.arrayBuffer();

    let type = 'jpg';
    const mime = (blob.type || '').toLowerCase();
    if (mime.includes('png'))      type = 'png';
    else if (mime.includes('gif')) type = 'gif';
    else if (mime.includes('bmp')) type = 'bmp';
    // default 'jpg' covers jpeg and any unrecognised/missing mime

    let width = MAX_IMG_WIDTH, height = MAX_IMG_WIDTH;
    try {
      const bmp = await createImageBitmap(blob);
      width  = bmp.width;
      height = bmp.height;
      if (bmp.close) bmp.close();
    } catch (e) {
      // Can't measure — fall back to a square placeholder size rather than failing the export
    }
    if (width > MAX_IMG_WIDTH) {
      height = Math.round(height * (MAX_IMG_WIDTH / width));
      width  = MAX_IMG_WIDTH;
    }
    return { data: buf, type, width, height };
  } catch (e) {
    console.warn('DOCX: could not load image', src, e);
    return null; // caller falls back to a "No Image" text cell
  }
}

function textCell(text, { bold = false, width, shading, italics = false } = {}) {
  return new docx.TableCell({
    width: width != null ? { size: width, type: docx.WidthType.PERCENTAGE } : undefined,
    shading: shading ? { fill: shading } : undefined,
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    children: [new docx.Paragraph({
      children: [new docx.TextRun({ text: String(text ?? ''), bold, italics, size: 15 })],
    })],
  });
}

async function imageCell(src, width) {
  const img = await loadImageForDocx(src);
  const children = img
    ? [new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [new docx.ImageRun({
          data: img.data,
          type: img.type,
          transformation: { width: img.width, height: img.height },
        })],
      })]
    : [new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [new docx.TextRun({ text: 'No Image', italics: true, size: 15 })],
      })];
  return new docx.TableCell({
    width: { size: width, type: docx.WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    children,
  });
}

export async function downloadDOCX() {
  if (typeof docx === 'undefined' || typeof saveAs === 'undefined') {
    alert('❌ Word export library failed to load. Check your internet connection, refresh the page, and try again.');
    return;
  }

  const projName = document.getElementById('exp-proj').value;
  const projLoc  = document.getElementById('exp-loc').value;
  const inspDate = document.getElementById('exp-date').value;
  if (!inspDate) { alert('Select inspection date'); return; }

  const items = state.punchItems;
  if (!items.length) { alert('No items to export.'); return; }

  const btn = document.getElementById('exportDocxBtn');
  const prevText = btn.innerText;
  btn.disabled  = true;
  btn.innerText = 'Building document… (0%)';

  try {
    const COLW = { num: 4, loc: 11, desc: 15, pri: 5, status: 8, idate: 8, cdate: 8, insp: 13, close: 13, rem: 15 };

    const headerRow = new docx.TableRow({
      tableHeader: true,
      children: [
        textCell('#',                { bold: true, width: COLW.num,    shading: 'E5E7EB' }),
        textCell('LOCATION',         { bold: true, width: COLW.loc,    shading: 'E5E7EB' }),
        textCell('DESCRIPTION',      { bold: true, width: COLW.desc,   shading: 'E5E7EB' }),
        textCell('PRI',              { bold: true, width: COLW.pri,    shading: 'E5E7EB' }),
        textCell('STATUS',           { bold: true, width: COLW.status, shading: 'E5E7EB' }),
        textCell('INSPECTION DATE',  { bold: true, width: COLW.idate,  shading: 'E5E7EB' }),
        textCell('CLOSED DATE',      { bold: true, width: COLW.cdate,  shading: 'E5E7EB' }),
        textCell('INSPECTION PHOTO', { bold: true, width: COLW.insp,   shading: 'E5E7EB' }),
        textCell('CLOSE-OUT PHOTO',  { bold: true, width: COLW.close,  shading: 'E5E7EB' }),
        textCell('REMARKS',          { bold: true, width: COLW.rem,    shading: 'E5E7EB' }),
      ],
    });

    const rows = [headerRow];

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const [inspCell, closeCell] = await Promise.all([
        imageCell(it.inspectionPhoto, COLW.insp),
        imageCell(it.closeoutPhoto,   COLW.close),
      ]);
      rows.push(new docx.TableRow({
        children: [
          textCell(idx + 1,                                            { width: COLW.num }),
          textCell(it.location,                                        { width: COLW.loc }),
          textCell(it.desc,                                            { width: COLW.desc }),
          textCell(it.priority,                                        { width: COLW.pri }),
          textCell(it.status,                                          { width: COLW.status }),
          textCell(formatDate(it.inspectionDate || it.createdAt),      { width: COLW.idate }),
          textCell(it.closedAt ? formatDate(it.closedAt) : '—',        { width: COLW.cdate }),
          inspCell,
          closeCell,
          textCell(it.remarks || '',                                   { width: COLW.rem }),
        ],
      }));
      btn.innerText = `Building document… (${Math.round(((idx + 1) / items.length) * 100)}%)`;
    }

    const table = new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows,
    });

    const doc = new docx.Document({
      sections: [{
        properties: {
          page: {
            // Landscape A4 — docx-js swaps width/height internally, so pass
            // the portrait short/long edge dims and set orientation:LANDSCAPE.
            size: { width: 11906, height: 16838, orientation: docx.PageOrientation.LANDSCAPE },
            margin: { top: 500, bottom: 500, left: 500, right: 500 },
          },
        },
        children: [
          new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            shading: { fill: 'EEF2FF' },
            children: [new docx.TextRun({ text: 'QA/QC PUNCHLIST TRACKING FORM', bold: true, size: 26 })],
          }),
          new docx.Paragraph({ text: '' }),
          new docx.Paragraph({ children: [
            new docx.TextRun({ text: 'Project: ', bold: true }),
            new docx.TextRun({ text: projName || '' }),
          ] }),
          new docx.Paragraph({ children: [
            new docx.TextRun({ text: 'Location: ', bold: true }),
            new docx.TextRun({ text: projLoc || '' }),
          ] }),
          new docx.Paragraph({ children: [
            new docx.TextRun({ text: 'Inspection Date: ', bold: true }),
            new docx.TextRun({ text: inspDate }),
          ] }),
          new docx.Paragraph({ text: '' }),
          table,
          new docx.Paragraph({ text: '' }),
          new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            children: [new docx.TextRun({ text: '** For Internal Use Only **', size: 14 })],
          }),
          new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            children: [new docx.TextRun({ text: 'TSDCI-TGRDC-QAQC-FORM', size: 14 })],
          }),
        ],
      }],
    });

    btn.innerText = 'Packing .docx…';
    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, `Punchlist_${Date.now()}.docx`);
  } catch (e) {
    console.error('DOCX export failed:', e);
    alert('❌ Word export failed: ' + e.message);
  } finally {
    btn.disabled  = false;
    btn.innerText = prevText;
  }
}
