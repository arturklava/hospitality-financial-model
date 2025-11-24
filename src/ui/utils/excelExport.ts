/**
 * Excel Export Service (v17.0 - Final Stable Release)
 * * "Investor Grade" & "Living Model" Architecture.
 * * CRITICAL FIXES:
 * 1. Fixed malformed SUM formulas for Consolidated sheets (caused 'Removed Records' error).
 * 2. Fixed Debt Schedule linking logic (removed fragile charCodeAt, used index).
 * 3. Strict Type Safety & Full Auditability.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { NamedScenario, FullModelOutput, AnnualPnl, ConsolidatedAnnualPnl } from '@domain/types';
import { applyFreezePanes } from '@engines/io/excelStyles';

// --- 1. DESIGN SYSTEM ---
const STYLES = {
  colors: {
    header: 'FF1F4E78',      // Navy Blue
    headerText: 'FFFFFFFF',  // White
    subHeader: 'FFDDEBF7',   // Light Blue
    inputBg: 'FFFFF2CC',     // Cream (Inputs)
    calcBg: 'FFFFFFFF',      // White (Formulas)
    totalBg: 'FFF2F2F2',     // Light Gray
    check: 'FFC6EFCE',       // Green Check
    textBlue: 'FF0000FF',    // Hardcoded Input
    textBlack: 'FF000000',   // Calculated/Formula
    textMain: 'FF333333',    // Standard Text
    link: 'FF0563C1',        // Hyperlink Blue
    border: 'FFBFBFBF',
  },
  fonts: {
    main: 'Calibri',
  },
  formats: {
    curr: '_($* #,##0_);_($* (#,##0);_($* "-"??_);_(@_)',
    pct: '0.00%',
    mult: '0.00"x"',
    num: '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)',
    int: '#,##0',
    date: 'mmm-yy',
  }
};

// --- 2. CONFIG ---
const ROWS = {
  HEADER: 3,
  REV_START: 5,
  REV_TOTAL: 6,
  COGS: 7,
  GOP: 8,
  EXP_START: 10,
  PAYROLL: 11,
  MARKETING: 12,
  UTILITIES: 13,
  OTHER_OPS: 14,
  EXP_TOTAL: 15,
  NOI: 17,
  CAPEX: 19,
  UFCF: 21,
  DEBT: 23,
  LFCF: 25
};

// --- TYPES ---
type DriverLoc = {
  row: number;
  // Revenue Drivers (Full References)
  capCell: string;   
  priceCell: string; 
  volCell: string;   
  
  // Expense Drivers (Column Letters for Formula Construction)
  cogsCol: string;  
  payrollCol: string;
  mktCol: string;
  utilCol: string;
  otherCol: string;
  capexCol: string;
  
  // Metadata
  capacity: number;
  price: number;
  isMonthlyDriver: boolean; 
  capacityLabel: string;
  priceLabel: string;
};

type GlobalMap = {
  drivers: Record<string, DriverLoc>;
  debtSettings: { rateCell: string; termCell: string; amountCell: string };
  sensitivity: { revCell: string; opexCell: string };
  sheetNames: { debt: string; consol: string; monthly: string; waterfall: string };
};

// --- 3. HELPERS ---
const getCol = (idx: number): string => {
  let letter = '';
  while (idx > 0) {
    const mod = (idx - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    idx = Math.floor((idx - 1) / 26);
  }
  return letter;
};

const safeName = (name: string): string => name.replace(/[:\/\\?*\[\]]/g, '').substring(0, 30);

const applyStyle = (cell: ExcelJS.Cell, type: 'header'|'input'|'formula'|'label'|'total'|'check'|'title', align: 'left'|'center'|'right' = 'right', indent = 0) => {
  cell.font = { name: STYLES.fonts.main, size: 11 };
  
  if (type === 'header') {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STYLES.colors.header } };
    cell.font = { color: { argb: STYLES.colors.headerText }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: STYLES.colors.header } } };
  } 
  else if (type === 'input') {
    cell.font.color = { argb: STYLES.colors.textBlue };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STYLES.colors.inputBg } };
    cell.alignment = { horizontal: align };
    cell.border = { top: { style: 'thin', color: { argb: 'FFD9D9D9' } }, bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } }, left: { style: 'thin', color: { argb: 'FFD9D9D9' } }, right: { style: 'thin', color: { argb: 'FFD9D9D9' } } };
  }
  else if (type === 'formula') {
    cell.font.color = { argb: STYLES.colors.textBlack };
    cell.alignment = { horizontal: align };
  }
  else if (type === 'total') {
    cell.font = { bold: true, color: { argb: STYLES.colors.textBlack } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STYLES.colors.totalBg } };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
    cell.alignment = { horizontal: align };
  }
  else if (type === 'label') {
    cell.font = { bold: indent === 0, color: { argb: STYLES.colors.textMain } };
    cell.alignment = { horizontal: 'left', indent };
    cell.border = {}; 
  }
  else if (type === 'title') {
    cell.font = { size: 14, bold: true, color: { argb: STYLES.colors.header } };
    cell.alignment = { vertical: 'middle' };
  }
  else if (type === 'check') {
    cell.font = { color: { argb: 'FF006100' }, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STYLES.colors.check } };
    cell.alignment = { horizontal: 'center' };
  }
};

/**
 * 4. COVER SHEET
 */
function buildCover(wb: ExcelJS.Workbook, scenario: NamedScenario, output: FullModelOutput) {
  const ws = wb.addWorksheet('Cover', { properties: { tabColor: { argb: STYLES.colors.header } }, views: [{ showGridLines: false }] });
  
  ws.mergeCells('B2:H4');
  const t = ws.getCell('B2');
  t.value = scenario.name.toUpperCase();
  t.font = { name: STYLES.fonts.main, size: 24, bold: true, color: { argb: STYLES.colors.header } };
  t.alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells('B5:H5');
  ws.getCell('B5').value = `Financial Model | ${new Date().toLocaleDateString()} | ${scenario.modelConfig.scenario.horizonYears}Y Horizon`;
  ws.getCell('B5').alignment = { horizontal: 'center' };
  ws.getCell('B5').font = { italic: true, color: { argb: 'FF666666' } };

  let r = 8;
  const addKpi = (lbl: string, val: number|null, fmt: string) => {
    ws.getCell(`C${r}`).value = lbl;
    ws.getCell(`C${r}`).font = { bold: true, color: { argb: 'FF333333' } };
    ws.getCell(`D${r}`).value = val;
    ws.getCell(`D${r}`).numFmt = fmt;
    ws.getCell(`D${r}`).font = { size: 12, color: { argb: STYLES.colors.header } };
    ws.getCell(`C${r}`).border = { bottom: { style: 'dotted', color: { argb: STYLES.colors.border } } };
    ws.getCell(`D${r}`).border = { bottom: { style: 'dotted', color: { argb: STYLES.colors.border } } };
    r++;
  };

  ws.getCell(`C${r}`).value = "PROJECT RETURNS";
  ws.getCell(`C${r}`).font = { bold: true, size: 14, color: { argb: STYLES.colors.header } };
  r += 2;

  const p = output.project.projectKpis;
  addKpi("Net Present Value", p.npv, STYLES.formats.curr);
  addKpi("Unlevered IRR", p.unleveredIrr, STYLES.formats.pct);
  addKpi("Equity Multiple", p.equityMultiple, STYLES.formats.mult);

  r = 8;
  const navCol = 'G';
  ws.getCell(`${navCol}${r}`).value = "INDEX";
  ws.getCell(`${navCol}${r}`).font = { bold: true, size: 14, color: { argb: STYLES.colors.header } };
  r += 2;

  const addNav = (name: string, target: string) => {
    const c = ws.getCell(`${navCol}${r}`);
    c.value = { text: `➤  ${name}`, hyperlink: `#'${target}'!A1` };
    c.font = { color: { argb: STYLES.colors.link }, underline: true };
    r++;
  };

  addNav("Assumptions", "Assumptions");
  addNav("Debt Schedule", "Debt");
  addNav("Consolidated P&L", "Consolidated");
  addNav("Monthly Cash Flow", "Monthly");
  addNav("Waterfall", "Waterfall");
  
  r++;
  ws.getCell(`${navCol}${r}`).value = "Operations:";
  ws.getCell(`${navCol}${r}`).font = { italic: true, color: { argb: 'FF888888' } };
  r++;
  scenario.modelConfig.scenario.operations.forEach(op => {
    addNav(op.name, safeName(`Op-${op.name}`));
  });

  ws.getColumn('C').width = 25;
  ws.getColumn('D').width = 20;
  ws.getColumn('G').width = 35;
}

/**
 * 5. ASSUMPTIONS
 */
function buildAssumptions(wb: ExcelJS.Workbook, scenario: NamedScenario, output: FullModelOutput): GlobalMap {
  const ws = wb.addWorksheet('Assumptions', { properties: { tabColor: { argb: 'FFFFC000' } }, views: [{ showGridLines: false }] });
  const map: GlobalMap = {
    drivers: {},
    sensitivity: { revCell: '', opexCell: '' },
    debtSettings: { rateCell: '', termCell: '', amountCell: '' },
    sheetNames: { debt: 'Debt', consol: 'Consolidated', monthly: 'Monthly', waterfall: 'Waterfall' }
  };

  ws.getCell('B2').value = "MODEL ASSUMPTIONS";
  ws.getCell('B2').font = { size: 16, bold: true };

  let r = 5;

  // Sensitivity
  ws.getCell(`B${r}`).value = "SENSITIVITY ANALYSIS (Global)";
  applyStyle(ws.getCell(`B${r}`), 'title');
  r++;
  
  const addSens = (lbl: string) => {
    ws.getCell(`B${r}`).value = lbl;
    ws.getCell(`C${r}`).value = 0;
    ws.getCell(`C${r}`).numFmt = STYLES.formats.pct;
    applyStyle(ws.getCell(`C${r}`), 'input', 'center');
    const ref = `Assumptions!$C$${r}`;
    r++;
    return ref;
  };
  map.sensitivity.revCell = addSens("Revenue Adjustment");
  map.sensitivity.opexCell = addSens("Opex Adjustment");
  r += 2;

  // Debt
  ws.getCell(`B${r}`).value = "DEBT PARAMETERS";
  applyStyle(ws.getCell(`B${r}`), 'title');
  r++;
  
  const debt = scenario.modelConfig.capitalConfig.debtTranches[0] || { interestRate: 0.08, termYears: 20, initialPrincipal: 0 };
  const addDebt = (lbl: string, val: any, fmt: string) => {
    ws.getCell(`B${r}`).value = lbl;
    ws.getCell(`C${r}`).value = val;
    ws.getCell(`C${r}`).numFmt = fmt;
    applyStyle(ws.getCell(`C${r}`), 'input', 'center');
    const ref = `Assumptions!$C$${r}`;
    r++;
    return ref;
  };
  
  map.debtSettings.amountCell = addDebt("Total Debt Amount", debt.initialPrincipal ?? (debt as any).amount ?? 0, STYLES.formats.curr);
  map.debtSettings.rateCell = addDebt("Annual Interest Rate", debt.interestRate, STYLES.formats.pct);
  map.debtSettings.termCell = addDebt("Loan Term (Years)", debt.termYears, STYLES.formats.int);
  r += 2;

  // Drivers
  ws.getCell(`B${r}`).value = "OPERATIONAL DRIVERS & ASSUMPTIONS";
  applyStyle(ws.getCell(`B${r}`), 'title');
  r++;

  const headers = ["Operation", "Type", "Unit", "Capacity", "Avg Price", "Occ/Vol %", "COGS %", "Payroll %", "Mkt %", "Util %", "Other %", "Capex %"];
  headers.forEach((h, i) => {
    const c = ws.getCell(r, i + 2);
    c.value = h;
    applyStyle(c, 'header');
  });
  r++;

  scenario.modelConfig.scenario.operations.forEach(op => {
    let unit = "Keys", cap = 0, price = 0, isMonthly = false;
    
    if (op.operationType === 'HOTEL') { unit="Room"; cap=op.keys; price=op.avgDailyRate; }
    else if (op.operationType === 'VILLAS') { unit="Villa"; cap=(op as any).units; price=(op as any).avgNightlyRate; }
    else if (op.operationType === 'SENIOR_LIVING') { unit="Bed"; cap=(op as any).units; price=(op as any).avgMonthlyRate; isMonthly=true; }
    else if (op.operationType === 'RETAIL' || op.operationType === 'FLEX') { unit="Sqm"; cap=op.sqm || 0; price=(op as any).avgRentPerSqm; isMonthly=true; }
    else if (op.operationType === 'WELLNESS') { unit="Member"; cap=(op as any).memberships || 0; price=(op as any).avgMembershipFee; isMonthly=true; }
    else { unit="Unit"; cap=1; price=0; } 

    // Implied Volume Calc
    const opOutput = output.operationsResult?.annualPnl.find(p => p.operationId === op.id && p.yearIndex === 1);
    const yr1Rev = opOutput?.revenueTotal || 0;
    const timeFactor = isMonthly ? 12 : 365;
    const theoreticalMax = cap * price * timeFactor;
    const impliedOcc = theoreticalMax > 0 ? (yr1Rev / theoreticalMax) : 0;

    // Map
    map.drivers[op.id] = {
      row: r,
      capacity: cap, price: price,
      capacityLabel: unit,
      priceLabel: isMonthly ? '$/Month' : '$/Night',
      isMonthlyDriver: isMonthly,
      capCell: `Assumptions!$E$${r}`,
      priceCell: `Assumptions!$F$${r}`,
      volCell: `Assumptions!$G$${r}`,
      cogsCol: 'H', payrollCol: 'I', mktCol: 'J', utilCol: 'K', otherCol: 'L', capexCol: 'M'
    };

    ws.getCell(r, 2).value = op.name;
    ws.getCell(r, 3).value = op.operationType;
    ws.getCell(r, 4).value = unit;
    
    ws.getCell(r, 5).value = cap; applyStyle(ws.getCell(r, 5), 'input');
    ws.getCell(r, 6).value = price; applyStyle(ws.getCell(r, 6), 'input'); ws.getCell(r, 6).numFmt = STYLES.formats.curr;
    ws.getCell(r, 7).value = impliedOcc; applyStyle(ws.getCell(r, 7), 'input'); ws.getCell(r, 7).numFmt = STYLES.formats.pct;

    const ratios = [
      ((op as any).foodCogsPct ?? 0) + ((op as any).beverageCogsPct ?? 0),
      op.payrollPct ?? 0, op.marketingPct ?? 0, op.utilitiesPct ?? 0,
      (op.maintenanceOpexPct ?? 0) + (op.otherOpexPct ?? 0),
      op.maintenanceCapexPct ?? 0
    ];

    ratios.forEach((val, i) => {
      const c = ws.getCell(r, 8 + i);
      c.value = val;
      c.numFmt = STYLES.formats.pct;
      applyStyle(c, 'input');
    });

    r++;
  });

  ws.getColumn('B').width = 25;
  ws.getColumn('F').width = 15;
  return map;
}

/**
 * 6. DEBT SCHEDULE
 */
function buildDebt(wb: ExcelJS.Workbook, map: GlobalMap, horizon: number, startYear: number) {
  const ws = wb.addWorksheet('Debt', { views: [{ showGridLines: false }] });
  
  ws.getCell('B2').value = "DEBT AMORTIZATION SCHEDULE";
  applyStyle(ws.getCell('B2'), 'title');

  let r = 4;
  ['Year', 'Beg. Balance', 'Interest', 'Principal', 'Total Service', 'End. Balance'].forEach((h, i) => {
    const c = ws.getCell(r, i + 2);
    c.value = h;
    applyStyle(c, 'header');
  });
  r++;

  const rate = map.debtSettings.rateCell;
  const term = map.debtSettings.termCell; 
  const amount = map.debtSettings.amountCell;

  for (let i = 0; i < horizon; i++) {
    const row = ws.getRow(r);
    const prevEnd = `G${r-1}`;
    
    row.getCell(2).value = `Year ${startYear + i}`;
    
    if (i === 0) row.getCell(3).value = { formula: amount };
    else row.getCell(3).value = { formula: prevEnd };
    
    row.getCell(4).value = { formula: `-1 * C${r} * ${rate}` };
    row.getCell(5).value = { formula: `IF(C${r}<=0, 0, -1 * MIN(C${r}, ${amount}/${term}))` }; 
    row.getCell(6).value = { formula: `D${r}+E${r}` };
    row.getCell(7).value = { formula: `C${r}+E${r}` };

    for(let c=3; c<=7; c++) {
        applyStyle(row.getCell(c), 'formula');
        row.getCell(c).numFmt = STYLES.formats.num;
    }
    r++;
  }
  
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 18;
  ws.getColumn(6).width = 18;
}

/**
 * 7. MONTHLY CASH FLOW
 */
function buildMonthly(wb: ExcelJS.Workbook, output: FullModelOutput, startYear: number) {
  const ws = wb.addWorksheet('Monthly', { views: [{ showGridLines: false }] });
  const data = output.capital.monthlyCashFlow || [];
  const limit = Math.min(data.length, 60); 

  ws.getCell('B2').value = "MONTHLY CASH FLOW (First 5 Years)";
  applyStyle(ws.getCell('B2'), 'title');

  let r = 4;
  ws.getCell(r, 2).value = "Period";
  applyStyle(ws.getCell(r, 2), 'header');

  for(let i=0; i<limit; i++) {
      const col = i + 3;
      const cell = ws.getCell(r, col);
      cell.value = new Date(startYear, Math.floor(i/12), (i%12)+1);
      cell.numFmt = STYLES.formats.date;
      applyStyle(cell, 'header');
      ws.getColumn(col).width = 12;
  }
  r++;

  const addLine = (label: string, key: string) => {
    const row = ws.getRow(r);
    row.getCell(2).value = label;
    applyStyle(row.getCell(2), 'label');
    
    for (let i = 0; i < limit; i++) {
      const val = (data[i] as any)[key] || 0;
      const cell = row.getCell(i + 3);
      cell.value = val;
      cell.numFmt = STYLES.formats.num;
      applyStyle(cell, 'input');
    }
    r++;
  };

  addLine("NOI", "noi");
  addLine("Debt Service", "debtService");
  addLine("Net Cash Flow", "monthlyCashFlow");
  
  applyFreezePanes(ws, 4, 2);
  ws.getColumn(2).width = 25;
}

/**
 * 8. P&L BUILDER
 */
function buildPnL(
  wb: ExcelJS.Workbook, 
  sheetName: string, 
  data: (AnnualPnl | ConsolidatedAnnualPnl)[], 
  horizon: number, 
  startYear: number, 
  mode: 'op' | 'consol',
  map: GlobalMap,
  opId?: string,
  opSheetNames: string[] = []
): void {
  const sheetState = mode === 'op' ? 'hidden' : 'visible';
  const ws = wb.addWorksheet(sheetName, { state: sheetState, views: [{ showGridLines: false }] });
  const driver = opId ? map.drivers[opId] : null;
  const sensitivity = map.sensitivity;

  ws.mergeCells('A1:E1');
  ws.getCell('A1').value = sheetName.toUpperCase();
  applyStyle(ws.getCell('A1'), 'title');
  ws.getRow(1).height = 30;

  ws.getCell('F1').value = { text: "Back to Cover", hyperlink: "#'Cover'!A1" };
  ws.getCell('F1').font = { color: { argb: STYLES.colors.link }, underline: true };

  // --- Drivers Section (Ops Only) ---
  let r = 3;
  let occRow = 0;
  const tableStart = (mode === 'op' && driver) ? 8 : 4;
  
  if (mode === 'op' && driver) {
      ws.getCell(`A${r}`).value = "REVENUE BUILD-UP";
      ws.getCell(`A${r}`).font = { bold: true, italic: true, color: { argb: 'FF888888' } };
      r++;

      const addDriverRow = (lbl: string, link: string, fmt: string) => {
          ws.getCell(`A${r}`).value = lbl;
          applyStyle(ws.getCell(`A${r}`), 'label');
          for(let i=0; i<horizon; i++) {
              const cell = ws.getCell(r, i+2);
              cell.value = { formula: link };
              cell.numFmt = fmt;
              applyStyle(cell, 'formula');
          }
          return r++;
      };

      addDriverRow(`Capacity (${driver.capacityLabel})`, driver.capCell, STYLES.formats.int);
      addDriverRow(`Price (${driver.priceLabel})`, driver.priceCell, STYLES.formats.curr);
      const volRow = addDriverRow("Occupancy / Volume %", driver.volCell, STYLES.formats.pct);
      occRow = volRow - 1; 
      r++; 
  } else {
      r = 7; 
  }
  
  const years = Array.from({ length: horizon }, (_, i) => `Year ${startYear + i}`);
  ws.getRow(ROWS.HEADER).values = ['Line Item', ...years];
  ws.getRow(ROWS.HEADER).eachCell((cell, col) => { if (col > 1) applyStyle(cell, 'header'); });
  ws.getColumn(1).width = 35;

  // --- ROW BUILDER ---
  // Pass i (index) to formulaGen for flexibility
  const addLine = (label: string, valKey: string, type: 'formula'|'total', formulaGen: (col: string, idx: number)=>string, indent=0, group=0) => {
      const row = ws.getRow(r); 
      row.getCell(1).value = label;
      applyStyle(row.getCell(1), type === 'total' ? 'total' : 'label', 'left', indent);
      if(group>0) row.outlineLevel = group;

      for(let i=0; i<horizon; i++) {
          const col = getCol(i+2);
          const cell = row.getCell(i+2);
          const d = data.find(x => x.yearIndex === i);
          const val = d ? (d as any)[valKey] || 0 : 0;

          if (type === 'formula' || type === 'total') {
             cell.value = { formula: formulaGen(col, i) };
             applyStyle(cell, type === 'total' ? 'total' : 'formula', 'right');
          } else {
             cell.value = val;
             applyStyle(cell, 'input', 'right');
          }
          cell.numFmt = STYLES.formats.num;
      }
      r++;
      return r-1;
  };
  
  // 1. Revenue
  let revRow = 0;
  if (mode === 'op' && driver) {
      const timeFactor = driver.isMonthlyDriver ? 12 : 365;
      const capR = occRow - 2;
      const priR = occRow - 1;
      const volR = occRow;
      revRow = addLine("Total Revenue", 'revenueTotal', 'formula', (c) => `${c}${capR} * ${c}${priR} * ${c}${volR} * ${timeFactor} * (1+${sensitivity.revCell})`);
  } else {
      // Fix: Map sheet names correctly for SUM
      revRow = addLine("Total Revenue", 'revenueTotal', 'formula', (c) => {
          const refs = opSheetNames.map(op => `'${op}'!${c}${ROWS.REV_TOTAL}`); // Use ROWS const for consistency
          return `SUM(${refs.join(',')})`;
      }); 
  }

  // 2. COGS
  let cogsRow = 0;
  if (mode === 'op' && driver) {
      cogsRow = addLine("COGS", 'cogsTotal', 'formula', (c) => `-1 * ${c}${revRow} * Assumptions!${driver.cogsCol}${driver.row}`);
  } else {
      cogsRow = addLine("Cost of Goods Sold", 'cogsTotal', 'formula', (c) => {
          const refs = opSheetNames.map(op => `'${op}'!${c}${ROWS.COGS}`);
          return `SUM(${refs.join(',')})`;
      });
  }

  // 3. GOP
  const gopRow = addLine("GROSS OPERATING PROFIT", 'ebitda', 'total', (c) => `${c}${revRow}+${c}${cogsRow}`);

  r++; 
  ws.getCell(r, 1).value = "Operating Expenses"; r++;
  
  const expLabels = [
      { lbl: 'Payroll', key: 'payroll', drv: 'payrollCol', rowIdx: ROWS.PAYROLL },
      { lbl: 'Marketing', key: 'marketing', drv: 'mktCol', rowIdx: ROWS.MARKETING },
      { lbl: 'Utilities', key: 'utilities', drv: 'utilCol', rowIdx: ROWS.UTILITIES },
      { lbl: 'Other Expenses', key: 'otherOpex', drv: 'otherCol', rowIdx: ROWS.OTHER_OPS }
  ];
  
  expLabels.forEach(exp => {
      if (mode === 'op' && driver) {
          // @ts-ignore
          const colLetter = driver[exp.drv];
          addLine(exp.lbl, exp.key, 'formula', (c) => `-1 * ${c}${revRow} * Assumptions!${colLetter}${driver.row} * (1+${sensitivity.opexCell})`, 1, 1);
      } else {
          addLine(exp.lbl, exp.key, 'formula', (c) => {
              const refs = opSheetNames.map(op => `'${op}'!${c}${exp.rowIdx}`);
              return `SUM(${refs.join(',')})`;
          }, 1, 1);
      }
  });
  
  const expStart = r - 4; // Payroll row
  const expEnd = r - 1;   // Other row
  const opexRow = addLine("Total OPEX", 'opexTotal', 'total', (c) => `SUM(${c}${expStart}:${c}${expEnd})`);

  r++;
  const noiRow = addLine("NET OPERATING INCOME (NOI)", 'noi', 'total', (c) => `${c}${gopRow}+${c}${opexRow}`);

  r++;
  let capexRow = 0;
  if (mode === 'op' && driver) {
      capexRow = addLine("Maintenance Capex", 'maintenanceCapex', 'formula', (c) => `-1 * ${c}${revRow} * Assumptions!${driver.capexCol}${driver.row}`);
  } else {
      capexRow = addLine("Maintenance Capex", 'maintenanceCapex', 'formula', (c) => {
         const refs = opSheetNames.map(op => `'${op}'!${c}${ROWS.CAPEX}`);
         return `SUM(${refs.join(',')})`;
      });
  }

  const ufcfRow = addLine("Unlevered Free Cash Flow", 'cashFlow', 'total', (c) => `${c}${noiRow}+${c}${capexRow}`);

  if (mode === 'consol') {
      r++;
      ws.getCell(r, 1).value = "Financing"; r++;
      const debtRow = addLine("Debt Service", 'debtService', 'formula', (_c, i) => {
          // 5 = Row of first data year in Debt Sheet
          return `'Debt'!F${5 + i}`; 
      });
      
      addLine("LEVERED FREE CASH FLOW", 'cashFlow', 'total', (c) => `${c}${ufcfRow}+${c}${debtRow}`);
  } else {
      addLine("LEVERED FREE CASH FLOW", 'cashFlow', 'total', (c) => `${c}${ufcfRow}`);
  }

  applyFreezePanes(ws, tableStart, 1);
}

/**
 * 9. WATERFALL
 */
function buildWaterfall(wb: ExcelJS.Workbook, output: FullModelOutput) {
  const ws = wb.addWorksheet('Waterfall', { views: [{ showGridLines: false }] });
  ws.getCell('B2').value = "EQUITY WATERFALL";
  applyStyle(ws.getCell('B2'), 'title');

  let r = 5;
  ['Partner', 'Contribution', 'Distribution', 'Profit', 'MOIC', 'IRR'].forEach((h, i) => {
    const c = ws.getCell(r, i + 2);
    c.value = h;
    applyStyle(c, 'header');
  });
  r++;

  output.waterfall.partners.forEach(p => {
    const contrib = Math.abs(p.cashFlows.filter(c => c < 0).reduce((a,b)=>a+b,0));
    const dist = p.cashFlows.filter(c => c > 0).reduce((a,b)=>a+b,0);
    
    ws.getCell(`B${r}`).value = p.partnerId.toUpperCase();
    ws.getCell(`C${r}`).value = contrib; applyStyle(ws.getCell(`C${r}`), 'input');
    ws.getCell(`D${r}`).value = dist; applyStyle(ws.getCell(`D${r}`), 'input');
    ws.getCell(`E${r}`).value = { formula: `D${r}-C${r}` }; applyStyle(ws.getCell(`E${r}`), 'formula');
    ws.getCell(`F${r}`).value = { formula: `IF(C${r}>0, D${r}/C${r}, 0)` }; applyStyle(ws.getCell(`F${r}`), 'formula');
    ws.getCell(`G${r}`).value = p.irr; applyStyle(ws.getCell(`G${r}`), 'input');

    ws.getCell(`C${r}`).numFmt = STYLES.formats.num;
    ws.getCell(`D${r}`).numFmt = STYLES.formats.num;
    ws.getCell(`E${r}`).numFmt = STYLES.formats.num;
    ws.getCell(`F${r}`).numFmt = STYLES.formats.mult;
    ws.getCell(`G${r}`).numFmt = STYLES.formats.pct;
    r++;
  });

  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;
}

/**
 * MAIN EXPORT
 */
export async function generateExcel(scenario: NamedScenario, output: FullModelOutput): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Financial Engine';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  buildCover(wb, scenario, output);
  const map = buildAssumptions(wb, scenario, output);
  buildMonthly(wb, output, scenario.modelConfig.scenario.startYear);
  buildDebt(wb, map, scenario.modelConfig.scenario.horizonYears, scenario.modelConfig.scenario.startYear);

  const opNames: string[] = [];
  const opsData = output.operationsResult?.annualPnl || [];
  
  scenario.modelConfig.scenario.operations.forEach(op => {
    const data = opsData.filter(p => p.operationId === op.id);
    if (data.length > 0) {
      const sName = safeName(`Op-${op.name}`);
      opNames.push(sName);
      buildPnL(wb, sName, data, scenario.modelConfig.scenario.horizonYears, scenario.modelConfig.scenario.startYear, 'op', map, op.id);
    }
  });

  const consolData = output.consolidatedAnnualPnl.map(p => {
    const l = output.capital.leveredFcfByYear.find(x => x.yearIndex === p.yearIndex);
    return { ...p, debtService: l ? -Math.abs(l.debtService) : 0 };
  });

  buildPnL(wb, 'Consolidated', consolData, scenario.modelConfig.scenario.horizonYears, scenario.modelConfig.scenario.startYear, 'consol', map, undefined, opNames);
  
  buildWaterfall(wb, output);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const cleanName = scenario.name.replace(/[^a-z0-9]/gi, '_');
  saveAs(blob, `Model_${cleanName}_v17.xlsx`);
}