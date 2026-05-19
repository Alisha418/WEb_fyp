import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AreaReportChartRow } from './reportArea';
import { sumAreaRows } from './reportArea';

const BRAND = {
  emerald: [16, 185, 129] as [number, number, number],
  slateDark: [15, 23, 42] as [number, number, number],
  slateMid: [30, 41, 59] as [number, number, number],
  slateText: [148, 163, 184] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  sky: [14, 165, 233] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  violet: [139, 92, 246] as [number, number, number],
  orange: [245, 158, 11] as [number, number, number],
};

export async function downloadAreaChartPdf(
  chartElement: HTMLElement | null,
  rows: AreaReportChartRow[],
  title = 'Reports by Reporting Area',
  chartPeriodDays = 0,
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const grand = sumAreaRows(rows);
  const generatedAt = new Date().toLocaleString();
  const pendingKpiTotal = grand.pending_citizen + grand.pending_admin;

  pdf.setFillColor(...BRAND.slateDark);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setFillColor(...BRAND.emerald);
  pdf.rect(0, 28, pageW, 1.2, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('NeatNow Admin — Area Report Summary', margin, 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...BRAND.slateText);
  pdf.text(title, margin, 21);
  const periodLabel =
    chartPeriodDays > 0 ? `Period: last ${chartPeriodDays} days` : 'Period: all reports';
  pdf.text(`${periodLabel}  |  Generated: ${generatedAt}`, pageW - margin, 21, {
    align: 'right',
  });

  let y = 36;

  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, 'F');

  const summaryItems: { label: string; value: number; color: [number, number, number] }[] = [
    { label: 'Total', value: grand.reports, color: BRAND.slateDark },
    { label: 'Pending (accepted)', value: grand.pending_citizen, color: BRAND.amber },
    { label: 'Pending (admin)', value: grand.pending_admin, color: BRAND.violet },
    { label: 'Unassigned', value: grand.unassigned, color: BRAND.orange },
    { label: 'In Progress', value: grand.in_progress, color: BRAND.sky },
    { label: 'Resolved', value: grand.resolved, color: BRAND.green },
  ];

  const chipW = (pageW - margin * 2) / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const cx = margin + chipW * i + chipW / 2;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...BRAND.slateText);
    pdf.text(item.label.toUpperCase(), cx, y + 6, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...item.color);
    pdf.text(String(item.value), cx, y + 13, { align: 'center' });
  });

  y += 24;

  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgW = pageW - margin * 2;
      const imgH = Math.min((canvas.height * imgW) / canvas.width, 52);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(...BRAND.slateDark);
      pdf.text('Volume overview (bar chart)', margin, y);
      y += 5;
      pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      y += 2;
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...BRAND.slateDark);
  pdf.text('Detailed breakdown by reporting area', margin, y);
  y += 4;

  const tableBody = rows.map((row) => [
    row.area,
    String(row.pending_citizen),
    String(row.pending_admin),
    String(row.unassigned),
    String(row.in_progress),
    String(row.resolved),
    String(row.rejected),
    String(row.reports),
  ]);

  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        'Reporting area',
        'Pending (accepted)',
        'Pending (admin)',
        'Unassigned',
        'In progress',
        'Resolved',
        'Rejected',
        'Total',
      ],
    ],
    body: tableBody,
    foot: [
      [
        'Grand total (all areas)',
        String(grand.pending_citizen),
        String(grand.pending_admin),
        String(grand.unassigned),
        String(grand.in_progress),
        String(grand.resolved),
        String(grand.rejected),
        String(grand.reports),
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      textColor: BRAND.slateDark,
    },
    headStyles: {
      fillColor: BRAND.emerald,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    footStyles: {
      fillColor: BRAND.slateMid,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 42 },
      1: { halign: 'center', fillColor: [255, 251, 235] },
      2: { halign: 'center', fillColor: [245, 243, 255] },
      3: { halign: 'center', fillColor: [255, 247, 237] },
      4: { halign: 'center', fillColor: [240, 249, 255] },
      5: { halign: 'center', fillColor: [240, 253, 244] },
      6: { halign: 'center', fillColor: [254, 242, 242] },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      const pageCount = pdf.getNumberOfPages();
      pdf.setFontSize(8);
      pdf.setTextColor(...BRAND.slateText);
      pdf.text(
        `NeatNow — Confidential admin report  |  Page ${data.pageNumber} of ${pageCount}`,
        pageW / 2,
        pageH - 6,
        { align: 'center' },
      );
    },
  });

  const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  if (finalY < pageH - 28) {
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(...BRAND.slateText);
    pdf.text(
      `Pending (accepted): citizen report, worker accepted, not started  |  Pending (admin): admin assigned, not started  |  Unassigned: no worker assigned  |  Dashboard Pending KPI = ${pendingKpiTotal}`,
      margin,
      Math.min(finalY + 8, pageH - 14),
      { maxWidth: pageW - margin * 2 },
    );
  }

  pdf.save(`neatnow-reports-by-area-${new Date().toISOString().slice(0, 10)}.pdf`);
}
