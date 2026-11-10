// Builds PDF and Excel files in the browser. The heavy libraries are loaded
// only when a report is actually requested, so the rest of the app stays fast.

const BRAND_RGB = [44, 82, 144];

export async function buildPdf({ title, subtitle, head, body }) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(22, 26, 33);
  doc.text(title, 40, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(112, 122, 137);
  doc.text(subtitle, 40, 60);

  autoTable(doc, {
    startY: 74,
    head: [head],
    body,
    margin: { left: 40, right: 40, bottom: 40 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, overflow: 'linebreak', textColor: [38, 43, 53] },
    headStyles: { fillColor: BRAND_RGB, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 248, 250] },
  });

  const pages = doc.getNumberOfPages();
  const { width, height } = doc.internal.pageSize;
  doc.setFontSize(8);
  doc.setTextColor(112, 122, 137);
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.text(`LACED Media Production  -  Page ${i} of ${pages}`, width - 40, height - 20, { align: 'right' });
  }
  return doc;
}

export async function buildXlsx({ title, head, rows, moneyColumns = [] }) {
  const mod = await import('exceljs');
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LACED Media Production';
  wb.created = new Date();

  const ws = wb.addWorksheet(title.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Report');
  ws.addRow(head);
  rows.forEach((r) => ws.addRow(r));

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5290' } };
  header.alignment = { vertical: 'middle' };

  head.forEach((h, i) => {
    const longest = rows.reduce((m, r) => Math.max(m, String(r[i] ?? '').length), String(h).length);
    const col = ws.getColumn(i + 1);
    col.width = Math.min(Math.max(longest + 3, 12), 55);
    if (moneyColumns.includes(i)) col.numFmt = '#,##0.00';
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  if (head.length && rows.length) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: head.length } };
  }
  return wb.xlsx.writeBuffer();
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
