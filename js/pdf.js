// ============================================================
// pdf.js — PDF generation (preview + download via html2pdf)
// ============================================================

import { LOGO_URL } from './config.js?v=6';
import { state } from './state.js?v=6';
import { formatDate, escapeHtml } from './render.js?v=6';

// Each row holds two ~70px-tall photos, so 12 rows (the old value) is far
// taller than one A4-landscape page can actually hold — that overflow was
// causing rows to get sliced mid-table by html2canvas/jsPDF's pixel-based
// pagination and reappear at the top of the next page. 6 rows reliably
// fits one page given the current photo/row sizing in the CSS.
const ROWS_PER_PAGE = 6;

export function generatePDFHTML(itemsToExport, inspDate, projName, projLoc) {
  let allPages = '';

  for (let i = 0; i < itemsToExport.length; i += ROWS_PER_PAGE) {
    const pageItems = itemsToExport.slice(i, i + ROWS_PER_PAGE);

    let rows = '';
    pageItems.forEach((it, idx) => {
      const inspImg  = it.inspectionPhoto
        ? `<img src="${it.inspectionPhoto}" class="pdf-img" crossorigin="anonymous">`
        : '<span>No Image</span>';
      const closeImg = it.closeoutPhoto
        ? `<img src="${it.closeoutPhoto}" class="pdf-img" crossorigin="anonymous">`
        : '<span>No Image</span>';

      rows += `<tr>
        <td style="width:3%">${i + idx + 1}</td>
        <td style="width:14%">${escapeHtml(it.location)}</td>
        <td style="width:18%">${escapeHtml(it.desc)}</td>
        <td style="width:4%">${it.priority}</td>
        <td style="width:16%">${inspImg}</td>
        <td style="width:16%">${closeImg}</td>
        <td style="width:8%">${it.status}</td>
        <td style="width:8%">${formatDate(it.inspectionDate || it.createdAt)}<br>${it.closedAt ? formatDate(it.closedAt) : '—'}</td>
        <td style="width:13%">${escapeHtml(it.remarks || '')}</td>
      </tr>`;
    });

    const legendTable = `<table class="pdf-legend-table"><tr>
      <td style="background:#22c55e">OPEN</td>
      <td style="background:#eab308">IN PROGRESS</td>
      <td style="background:#3b82f6;color:#fff">FOR VERIFICATION</td>
      <td style="background:#d946ef;color:#fff">CLOSED</td>
      <td style="background:#9ca3af">VOIDED</td>
    </tr></table>`;

    allPages += `<div class="pdf-page">
      <div class="pdf-header-logo">
        <img src="${LOGO_URL}" class="pdf-logo-img" onerror="this.style.display='none'" crossorigin="anonymous">
      </div>
      <div class="pdf-title">QA/QC PUNCHLIST TRACKING FORM</div>
      <div class="pdf-info-grid">
        <div><strong>Project:</strong> ${escapeHtml(projName)}<br><strong>Location:</strong> ${escapeHtml(projLoc)}</div>
        <div><strong>Inspection Date:</strong> ${inspDate}</div>
      </div>
      <div>${legendTable}</div>
      <table class="pdf-table">
        <thead><tr><th>#</th><th>LOCATION</th><th>DESCRIPTION</th><th>PRI</th>
        <th>INSPECTION PHOTO</th><th>CLOSE-OUT PHOTO</th><th>STATUS</th><th>DATES</th><th>REMARKS</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="pdf-footer"><div>** For Internal Use Only **</div><div>TSDCI-TGRDC-QAQC-FORM</div></div>
    </div>`;
  }

  return allPages;
}

export function previewPDF() {
  const inspDate = document.getElementById('exp-date').value;
  if (!inspDate) { alert('Select inspection date'); return; }

  const projName = document.getElementById('exp-proj').value;
  const projLoc  = document.getElementById('exp-loc').value;
  const html     = generatePDFHTML(state.punchItems, inspDate, projName, projLoc);

  document.getElementById('pdf-content').innerHTML = html;
  document.getElementById('preview-modal').classList.add('open');
}

export function downloadPDF() {
  const element = document.getElementById('pdf-content');
  if (!element.innerHTML.trim()) { alert('Generate preview first'); return; }

  // ── Reset scroll before capture ──────────────────────────
  // html2canvas captures based on whatever scroll offset is active when it
  // runs. Since the preview modal is scrollable (36 rows of photos are much
  // taller than one screen), any leftover scroll position gets baked into
  // the PDF as blank pages before the real content. Reset everything to the
  // top first, then restore it afterwards for a smooth UX.
  const previewBody       = document.querySelector('.preview-body');
  const prevPreviewScroll = previewBody ? previewBody.scrollTop : 0;
  const prevWindowScrollX = window.scrollX;
  const prevWindowScrollY = window.scrollY;

  if (previewBody) previewBody.scrollTop = 0;
  window.scrollTo(0, 0);

  html2pdf()
    .set({
      margin:      [5, 8, 5, 8],
      filename:    `Punchlist_${Date.now()}.pdf`,
      image:       { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:   { mode: 'css', after: '.pdf-page' },
    })
    .from(element)
    .save()
    .then(() => {
      document.getElementById('preview-modal').classList.remove('open');
    })
    .finally(() => {
      if (previewBody) previewBody.scrollTop = prevPreviewScroll;
      window.scrollTo(prevWindowScrollX, prevWindowScrollY);
    });
}
