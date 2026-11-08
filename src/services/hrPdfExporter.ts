import {
  ComputedCellShift,
  CondoHrConfig,
  DayCoverageSummary,
  Employee,
  ScheduleValidationRecord,
  ShiftCode,
} from '@/types/hr';
import { getDaysInYearMonth, SHIFT_META } from '@/services/hrScheduleEngine';

const MONTH_NAMES_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatIsoDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return 'Não registrado';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} às ${hh}:${mm}`;
}

export function formatYearMonthFullPT(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  const mIdx = Number(mStr) - 1;
  return `${MONTH_NAMES_FULL[mIdx] ?? mStr} de ${yStr}`;
}

export interface ExportSchedulePdfParams {
  condoName: string;
  syndicName: string;
  config: CondoHrConfig;
  yearMonth: string;
  employees: Employee[];
  matrix: Map<string, ComputedCellShift>;
  daysSummary: DayCoverageSummary[];
  validationRecord: ScheduleValidationRecord;
  includeIndividualSlips?: boolean;
}

// =============================================================================
// Gerador Vetorial Nativo PDF 1.4 (Zero Dependências Externas, A4 Paisagem)
// Suporta acentuação completa PT-BR (WinAnsiEncoding) e múltiplas páginas
// =============================================================================

const PAGE_W = 841.89; // A4 Landscape largura em pt (297mm)
const PAGE_H = 595.28; // A4 Landscape altura em pt (210mm)

const WIN_ANSI_SPECIAL: Record<number, number> = {
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201c: 0x93, // “
  0x201d: 0x94, // ”
  0x2022: 0x95, // •
  0x2026: 0x85, // …
};

function encodePdfWinAnsiString(text: string): string {
  let out = '(';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x28) {
      out += '\\(';
    } else if (code === 0x29) {
      out += '\\)';
    } else if (code === 0x5c) {
      out += '\\\\';
    } else if (code >= 0x20 && code <= 0x7e) {
      out += text[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += `\\${code.toString(8).padStart(3, '0')}`;
    } else if (WIN_ANSI_SPECIAL[code] !== undefined) {
      out += `\\${WIN_ANSI_SPECIAL[code].toString(8).padStart(3, '0')}`;
    } else {
      out += ' ';
    }
  }
  out += ')';
  return out;
}

function rgbStr([r, g, b]: [number, number, number]): string {
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
}

class PdfPageCanvas {
  private ops: string[] = [];

  fillRect(x: number, yTop: number, w: number, h: number, rgb: [number, number, number]) {
    const pdfY = PAGE_H - yTop - h;
    this.ops.push(`${rgbStr(rgb)} rg`);
    this.ops.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  strokeRect(
    x: number,
    yTop: number,
    w: number,
    h: number,
    rgb: [number, number, number],
    lineWidth = 0.5
  ) {
    const pdfY = PAGE_H - yTop - h;
    this.ops.push(`${lineWidth.toFixed(2)} w`);
    this.ops.push(`${rgbStr(rgb)} RG`);
    this.ops.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }

  fillAndStrokeRect(
    x: number,
    yTop: number,
    w: number,
    h: number,
    fillRgb: [number, number, number],
    strokeRgb: [number, number, number],
    lineWidth = 0.4
  ) {
    const pdfY = PAGE_H - yTop - h;
    this.ops.push(`${lineWidth.toFixed(2)} w`);
    this.ops.push(`${rgbStr(fillRgb)} rg`);
    this.ops.push(`${rgbStr(strokeRgb)} RG`);
    this.ops.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
  }

  drawLine(
    x1: number,
    y1Top: number,
    x2: number,
    y2Top: number,
    rgb: [number, number, number],
    lineWidth = 0.5
  ) {
    const py1 = PAGE_H - y1Top;
    const py2 = PAGE_H - y2Top;
    this.ops.push(`${lineWidth.toFixed(2)} w`);
    this.ops.push(`${rgbStr(rgb)} RG`);
    this.ops.push(`${x1.toFixed(2)} ${py1.toFixed(2)} m ${x2.toFixed(2)} ${py2.toFixed(2)} l S`);
  }

  drawText(
    text: string,
    x: number,
    yTopBaseline: number,
    options: {
      font?: 'F1' | 'F2'; // F1 = Regular, F2 = Bold
      size?: number;
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
    } = {}
  ) {
    const font = options.font ?? 'F1';
    const size = options.size ?? 8;
    const color = options.color ?? [14, 27, 43];
    const align = options.align ?? 'left';

    // Estimativa precisa de largura média em Helvetica para alinhamento central/direito
    const approxCharWidth = font === 'F2' ? size * 0.54 : size * 0.5;
    const textW = text.length * approxCharWidth;
    let drawX = x;
    if (align === 'center') drawX = x - textW / 2;
    else if (align === 'right') drawX = x - textW;

    const pdfY = PAGE_H - yTopBaseline;
    this.ops.push('BT');
    this.ops.push(`/${font} ${size.toFixed(1)} Tf`);
    this.ops.push(`${rgbStr(color)} rg`);
    this.ops.push(`${drawX.toFixed(2)} ${pdfY.toFixed(2)} Td`);
    this.ops.push(`${encodePdfWinAnsiString(text)} Tj`);
    this.ops.push('ET');
  }

  getStream(): string {
    return this.ops.join('\n');
  }
}

function assemblePdfDocument(pages: PdfPageCanvas[]): Uint8Array {
  const objects: string[] = [];

  // Obj 1: Catalog
  // Obj 2: Pages
  // Obj 3: Font Helvetica Regular (F1)
  // Obj 4: Font Helvetica Bold (F2)
  // Para cada página i: Obj (5 + i*2) = Page, Obj (6 + i*2) = Content Stream
  const pageObjIds = pages.map((_, idx) => 5 + idx * 2);

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pages.length
    } >>\nendobj`
  );
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj'
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj'
  );

  pages.forEach((canvas, idx) => {
    const pageId = 5 + idx * 2;
    const contentId = 6 + idx * 2;
    const streamData = canvas.getStream();

    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W.toFixed(
        2
      )} ${PAGE_H.toFixed(
        2
      )}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream\nendobj`
    );
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const objStr of objects) {
    offsets.push(pdf.length);
    pdf += `${objStr}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}.`;
}

export function exportOfficialSchedulePdf(params: ExportSchedulePdfParams): void {
  const {
    condoName,
    syndicName,
    config,
    yearMonth,
    employees,
    matrix,
    daysSummary,
    validationRecord,
    includeIndividualSlips = true,
  } = params;

  const days = getDaysInYearMonth(yearMonth);
  const monthFullLabel = formatYearMonthFullPT(yearMonth);
  const validatedAtFormatted = formatIsoDateTimeBR(validationRecord.validated_at);
  const exportedAtFormatted = formatIsoDateTimeBR(validationRecord.last_exported_at);
  const authCode = validationRecord.validation_code ?? 'ESC-OFICIAL';
  const totalGaps = daysSummary.reduce((acc, d) => acc + d.gaps.length, 0);

  const pages: PdfPageCanvas[] = [];

  // =========================================================================
  // PÁGINA 1: QUADRO GERAL DA ESCALA MENSAL 24/7
  // =========================================================================
  const p1 = new PdfPageCanvas();
  pages.push(p1);

  // Cabeçalho escuro
  p1.fillRect(0, 0, PAGE_W, 56, [14, 27, 43]);
  p1.drawText(
    `ESCALA OFICIAL DE TRABALHO E REVEZAMENTO 24/7 — ${monthFullLabel.toUpperCase()}`,
    26,
    24,
    { font: 'F2', size: 12.5, color: [255, 255, 255] }
  );
  p1.drawText(
    `${condoName}   •   CNPJ Empregador: ${config.cnpj}   •   Responsável: ${syndicName}`,
    26,
    42,
    { font: 'F1', size: 8.5, color: [208, 220, 234] }
  );
  p1.drawText(`Protocolo: ${authCode}`, PAGE_W - 26, 24, {
    font: 'F2',
    size: 9,
    color: [42, 195, 139],
    align: 'right',
  });
  p1.drawText(
    totalGaps === 0
      ? 'Cobertura 24/7 Integral (Sem Desfalques)'
      : `Alerta: ${totalGaps} período(s) com desfalque sinalizado`,
    PAGE_W - 26,
    42,
    {
      font: 'F1',
      size: 8,
      color: totalGaps === 0 ? [208, 220, 234] : [252, 165, 165],
      align: 'right',
    }
  );

  // Caixa Oficial de Data de Validação e Exportação
  p1.fillAndStrokeRect(26, 66, PAGE_W - 52, 38, [241, 245, 249], [26, 115, 233], 0.8);
  p1.drawText('SELO OFICIAL DE VALIDAÇÃO E EXPORTAÇÃO:', 36, 80, {
    font: 'F2',
    size: 8,
    color: [26, 115, 233],
  });
  p1.drawText(`Validada em: ${validatedAtFormatted}`, 232, 80, {
    font: 'F2',
    size: 8,
    color: [14, 27, 43],
  });
  p1.drawText(
    `Validado por: ${truncateText(validationRecord.validated_by ?? syndicName, 28)}`,
    430,
    80,
    { font: 'F1', size: 8, color: [14, 27, 43] }
  );
  p1.drawText(`Exportada em: ${exportedAtFormatted}`, 615, 80, {
    font: 'F2',
    size: 8,
    color: [19, 121, 84],
  });
  p1.drawText(
    'Documento oficial válido para afixação e entrega pessoal aos colaboradores somente mediante registro das datas de validação e exportação acima.',
    36,
    95,
    { font: 'F1', size: 7.2, color: [71, 85, 105] }
  );

  // Geometria da Tabela Mensal
  const marginL = 26;
  const tableW = PAGE_W - 52; // ~790 pt
  const nameColW = 148;
  const totColW = 28;
  const dayColW = (tableW - nameColW - totColW) / days.length;
  const headerH = 24;
  const startTableY = 114;

  // Linha de Cabeçalho da Tabela
  p1.fillAndStrokeRect(marginL, startTableY, nameColW, headerH, [21, 38, 59], [203, 213, 225], 0.4);
  p1.drawText('Colaborador / Função', marginL + 6, startTableY + 15, {
    font: 'F2',
    size: 7.5,
    color: [255, 255, 255],
  });

  days.forEach((d, idx) => {
    const cx = marginL + nameColW + idx * dayColW;
    const ds = daysSummary[idx];
    const hasGap = (ds?.gaps.length ?? 0) > 0;
    const hdrBg: [number, number, number] = hasGap ? [185, 28, 28] : [21, 38, 59];

    p1.fillAndStrokeRect(cx, startTableY, dayColW, headerH, hdrBg, [203, 213, 225], 0.35);
    p1.drawText(String(d.day).padStart(2, '0'), cx + dayColW / 2, startTableY + 10.5, {
      font: 'F2',
      size: 6.5,
      color: [255, 255, 255],
      align: 'center',
    });
    p1.drawText(d.weekdayShort.slice(0, 3), cx + dayColW / 2, startTableY + 19.5, {
      font: 'F1',
      size: 5.2,
      color: [203, 213, 225],
      align: 'center',
    });
  });

  const totColX = marginL + nameColW + days.length * dayColW;
  p1.fillAndStrokeRect(totColX, startTableY, totColW, headerH, [21, 38, 59], [203, 213, 225], 0.4);
  p1.drawText('Tot', totColX + totColW / 2, startTableY + 15, {
    font: 'F2',
    size: 7,
    color: [255, 255, 255],
    align: 'center',
  });

  // Altura adaptativa das linhas para caber 10 ou mais funcionários
  const availableRowsH = 355;
  const empRowH = Math.min(28, Math.max(18, Math.floor(availableRowsH / Math.max(employees.length + 2, 1))));

  let curY = startTableY + headerH;

  employees.forEach((emp, empIdx) => {
    const stripeRgb: [number, number, number] =
      empIdx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    p1.fillAndStrokeRect(marginL, curY, nameColW, empRowH, stripeRgb, [203, 213, 225], 0.35);

    p1.drawText(truncateText(emp.full_name, 26), marginL + 5, curY + empRowH * 0.44, {
      font: 'F2',
      size: 7,
      color: [14, 27, 43],
    });
    p1.drawText(truncateText(emp.role, 30), marginL + 5, curY + empRowH * 0.82, {
      font: 'F1',
      size: 5.8,
      color: [100, 116, 139],
    });

    let workedCount = 0;
    days.forEach((d, dIdx) => {
      const cx = marginL + nameColW + dIdx * dayColW;
      const code = (matrix.get(`${emp.id}::${d.dateISO}`)?.shift_code ?? 'FG') as ShiftCode;
      if (code === 'D' || code === 'N' || code === 'C' || code === 'CD' || code === 'CN') {
        workedCount++;
      }
      const meta = SHIFT_META[code] ?? SHIFT_META.FG;
      p1.fillAndStrokeRect(
        cx,
        curY,
        dayColW,
        empRowH,
        meta.printBgRgb,
        [212, 220, 230],
        0.3
      );
      p1.drawText(code, cx + dayColW / 2, curY + empRowH * 0.62, {
        font: code === 'FG' ? 'F1' : 'F2',
        size: 6.5,
        color: meta.printTextRgb,
        align: 'center',
      });
    });

    p1.fillAndStrokeRect(totColX, curY, totColW, empRowH, stripeRgb, [203, 213, 225], 0.35);
    p1.drawText(String(workedCount), totColX + totColW / 2, curY + empRowH * 0.62, {
      font: 'F2',
      size: 7,
      color: [14, 27, 43],
      align: 'center',
    });

    curY += empRowH;
  });

  // Linhas de Conferência 24/7 (Diurno e Noturno)
  const covRowH = 18;
  const coverageRows = [
    { label: 'Equipe Diurna (06h–18h)', isDay: true },
    { label: 'Equipe Noturna (18h–06h)', isDay: false },
  ];

  for (const cov of coverageRows) {
    p1.fillAndStrokeRect(marginL, curY, nameColW, covRowH, [241, 245, 249], [180, 194, 210], 0.4);
    p1.drawText(cov.label, marginL + 5, curY + 12, {
      font: 'F2',
      size: 6.8,
      color: [14, 27, 43],
    });

    daysSummary.forEach((ds, idx) => {
      const cx = marginL + nameColW + idx * dayColW;
      const count = cov.isDay ? ds.day_shift_staff.length : ds.night_shift_staff.length;
      const ok = cov.isDay ? ds.day_ok : ds.night_ok;
      const bg: [number, number, number] = ok ? [209, 250, 229] : [254, 202, 202];
      const fg: [number, number, number] = ok ? [6, 95, 70] : [185, 28, 28];

      p1.fillAndStrokeRect(cx, curY, dayColW, covRowH, bg, [190, 205, 220], 0.3);
      p1.drawText(String(count), cx + dayColW / 2, curY + 12, {
        font: 'F2',
        size: 6.8,
        color: fg,
        align: 'center',
      });
    });

    p1.fillAndStrokeRect(totColX, curY, totColW, covRowH, [241, 245, 249], [180, 194, 210], 0.4);
    p1.drawText('24/7', totColX + totColW / 2, curY + 12, {
      font: 'F2',
      size: 6,
      color: [71, 85, 105],
      align: 'center',
    });

    curY += covRowH;
  }

  // Legenda e Assinatura no rodapé da Página 1
  const footerY = Math.max(curY + 16, 548);
  p1.drawText(
    'LEGENDA: D = Diurno 12x36 (06h-18h) | N = Noturno 12x36 (18h-06h) | C = Comercial | CD = Cobertura Diurna | CN = Cobertura Noturna | FG = Folga | FE = Férias | AT = Atestado',
    marginL,
    footerY,
    { font: 'F1', size: 6.8, color: [71, 85, 105] }
  );

  p1.drawLine(PAGE_W - 230, footerY + 14, PAGE_W - 26, footerY + 14, [100, 116, 139], 0.6);
  p1.drawText(
    `Assinatura Síndico(a): ${truncateText(validationRecord.validated_by ?? syndicName, 26)}`,
    PAGE_W - 128,
    footerY + 24,
    { font: 'F1', size: 7, color: [51, 65, 85], align: 'center' }
  );

  // =========================================================================
  // PÁGINA 2: PROTOCOLO INDIVIDUAL DE ENTREGA PESSOAL E ASSINATURA
  // =========================================================================
  if (includeIndividualSlips) {
    const p2 = new PdfPageCanvas();
    pages.push(p2);

    p2.fillRect(0, 0, PAGE_W, 50, [14, 27, 43]);
    p2.drawText(
      `PROTOCOLO DE ENTREGA PESSOAL DA ESCALA AOS COLABORADORES — ${monthFullLabel.toUpperCase()}`,
      26,
      22,
      { font: 'F2', size: 11.5, color: [255, 255, 255] }
    );
    p2.drawText(
      `${condoName} (CNPJ ${config.cnpj})   •   Validada em: ${validatedAtFormatted}   •   Exportada em: ${exportedAtFormatted}   •   Autenticação: ${authCode}`,
      26,
      39,
      { font: 'F1', size: 8, color: [208, 220, 234] }
    );

    p2.drawText(
      'Declaro ter recebido pessoalmente uma via impressa da escala mensal validada pela administração do condomínio, estando ciente dos meus plantões, horários e folgas.',
      26,
      68,
      { font: 'F1', size: 8, color: [51, 65, 85] }
    );

    const cols = [
      { title: 'Matrícula', w: 54 },
      { title: 'Colaborador (CNPJ)', w: 155 },
      { title: 'Cargo / Função', w: 150 },
      { title: 'Resumo de Plantões no Mês', w: 165 },
      { title: 'Data Entrega', w: 76 },
      { title: 'Assinatura Presencial do Colaborador', w: PAGE_W - 52 - 600 },
    ];

    let xCursor = 26;
    const p2StartY = 80;
    const p2HeaderH = 22;

    for (const c of cols) {
      p2.fillAndStrokeRect(
        xCursor,
        p2StartY,
        c.w,
        p2HeaderH,
        [21, 38, 59],
        [203, 213, 225],
        0.4
      );
      p2.drawText(c.title, xCursor + 6, p2StartY + 14, {
        font: 'F2',
        size: 7.5,
        color: [255, 255, 255],
      });
      xCursor += c.w;
    }

    const sigRowH = Math.min(38, Math.max(26, Math.floor(455 / Math.max(employees.length, 1))));
    let yRow = p2StartY + p2HeaderH;

    employees.forEach((emp, idx) => {
      let countD = 0;
      let countN = 0;
      let countC = 0;
      let countExtra = 0;
      let countFG = 0;
      let countFE = 0;

      for (const d of days) {
        const code = matrix.get(`${emp.id}::${d.dateISO}`)?.shift_code ?? 'FG';
        if (code === 'D') countD++;
        else if (code === 'N') countN++;
        else if (code === 'C') countC++;
        else if (code === 'CD' || code === 'CN') countExtra++;
        else if (code === 'FG') countFG++;
        else if (code === 'FE') countFE++;
      }

      const summaryParts: string[] = [];
      if (countD > 0) summaryParts.push(`${countD} Diurnos`);
      if (countN > 0) summaryParts.push(`${countN} Noturnos`);
      if (countC > 0) summaryParts.push(`${countC} Comerc.`);
      if (countExtra > 0) summaryParts.push(`${countExtra} Cobert.`);
      summaryParts.push(`${countFG} Folgas`);
      if (countFE > 0) summaryParts.push(`${countFE}d Férias`);

      const rowBg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      const cellValues = [
        emp.registration_code,
        truncateText(emp.full_name, 28),
        truncateText(emp.role, 28),
        truncateText(summaryParts.join(' • '), 34),
        '___/___/______',
        '',
      ];

      let cx = 26;
      cols.forEach((c, cIdx) => {
        p2.fillAndStrokeRect(cx, yRow, c.w, sigRowH, rowBg, [203, 213, 225], 0.4);
        if (cIdx < 5) {
          p2.drawText(cellValues[cIdx], cx + 6, yRow + sigRowH * 0.6, {
            font: cIdx <= 1 ? 'F2' : 'F1',
            size: 7.5,
            color: [14, 27, 43],
          });
        } else {
          // Linha pontilhada/contínua para assinatura física
          p2.drawLine(cx + 12, yRow + sigRowH - 8, cx + c.w - 12, yRow + sigRowH - 8, [148, 163, 184], 0.5);
        }
        cx += c.w;
      });

      yRow += sigRowH;
    });

    p2.drawText(
      `SGC Centriax • Escala Oficial Validada em ${validatedAtFormatted} e Exportada em ${exportedAtFormatted} • Protocolo ${authCode}`,
      26,
      576,
      { font: 'F1', size: 7, color: [100, 116, 139] }
    );
  }

  const pdfBytes = assemblePdfDocument(pages);
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const safeCondoSlug = condoName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const link = document.createElement('a');
  link.href = url;
  link.download = `Escala_Validada_${safeCondoSlug}_${yearMonth}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
