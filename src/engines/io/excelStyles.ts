/**
 * Excel Styles Module (v3.4)
 * 
 * Provides reusable ExcelJS styles for consistent formatting across the application.
 * Follows v3.0 architecture: logic in engines, UI in views.
 */

import type ExcelJS from 'exceljs';

/**
 * Header style: Dark Blue fill, White text, Bold, Centered.
 * 
 * Used for column headers and section titles.
 */
export const headerStyle: Partial<ExcelJS.Style> = {
  font: {
    bold: true,
    size: 12,
    color: { argb: 'FFFFFFFF' }, // White text
  },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E78' }, // Dark Blue (#1F4E78)
  },
  alignment: {
    vertical: 'middle',
    horizontal: 'center',
  },
};

/**
 * KPI style: Border double, Font size 14, Bold.
 * 
 * Used for key performance indicators and important metrics.
 */
export const kpiStyle: Partial<ExcelJS.Style> = {
  font: {
    bold: true,
    size: 14,
  },
  border: {
    top: { style: 'double' },
    left: { style: 'double' },
    bottom: { style: 'double' },
    right: { style: 'double' },
  },
};

/**
 * Currency style: Format "$#,##0.00".
 * 
 * Used for financial values in currency format.
 */
export const currencyStyle: Partial<ExcelJS.Style> = {
  numFmt: '$#,##0.00',
  alignment: {
    horizontal: 'right',
  },
};

/**
 * Apply header style to a row.
 * 
 * @param row - The ExcelJS row to style
 */
export function applyHeaderStyleToRow(row: ExcelJS.Row): void {
  if (headerStyle.font) row.font = headerStyle.font;
  if (headerStyle.fill) row.fill = headerStyle.fill;
  if (headerStyle.alignment) row.alignment = headerStyle.alignment;
  row.height = 20;
}

/**
 * Apply header style to a cell.
 * 
 * @param cell - The ExcelJS cell to style
 */
export function applyHeaderStyleToCell(cell: ExcelJS.Cell): void {
  if (headerStyle.font) cell.font = headerStyle.font;
  if (headerStyle.fill) cell.fill = headerStyle.fill;
  if (headerStyle.alignment) cell.alignment = headerStyle.alignment;
}

/**
 * Apply KPI style to a cell.
 * 
 * @param cell - The ExcelJS cell to style
 */
export function applyKpiStyleToCell(cell: ExcelJS.Cell): void {
  if (kpiStyle.font) cell.font = kpiStyle.font;
  if (kpiStyle.border) cell.border = kpiStyle.border;
}

/**
 * Apply currency style to a cell.
 * 
 * @param cell - The ExcelJS cell to style
 */
export function applyCurrencyStyleToCell(cell: ExcelJS.Cell): void {
  if (currencyStyle.numFmt) cell.numFmt = currencyStyle.numFmt;
  if (currencyStyle.alignment) cell.alignment = currencyStyle.alignment;
}

/**
 * Apply freeze panes to a worksheet.
 * 
 * Freezes rows and/or columns so they remain visible when scrolling.
 * 
 * @param worksheet - The ExcelJS worksheet
 * @param row - Row number (1-based) to freeze above (0 = no row freeze)
 * @param col - Column number (1-based) to freeze to the left (0 = no column freeze)
 */
export function applyFreezePanes(
  worksheet: ExcelJS.Worksheet,
  row: number = 0,
  col: number = 0
): void {
  if (row > 0 || col > 0) {
    worksheet.views = [
      {
        state: 'frozen',
        ySplit: row > 0 ? row : undefined,
        xSplit: col > 0 ? col : undefined,
        topLeftCell: row > 0 && col > 0 
          ? worksheet.getCell(row + 1, col + 1).address 
          : undefined,
      },
    ];
  }
}

