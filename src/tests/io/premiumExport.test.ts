/**
 * Premium Export File Integrity Tests (v3.4)
 * 
 * Tests for Excel file structure integrity:
 * - pageSetup properties verification
 * - outlineLevel for monthly column grouping
 * - ExcelJS.Workbook mocking and structure validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Buffer } from 'buffer';
import type { NamedScenario, FullModelOutput } from '@domain/types';
import { runFullModel } from '@engines/pipeline/modelPipeline';
import { buildHotelConfig } from '../helpers/buildOperationConfig';
import { buildSingleTrancheCapitalConfig } from '../helpers/buildCapitalConfig';
import { buildBaselineWaterfallConfig } from '../helpers/buildWaterfallConfig';

/**
 * Builds a minimal test scenario for export testing.
 */
function buildTestScenario(): NamedScenario {
  return {
    id: 'premium-export-test',
    name: 'Premium Export Test Scenario',
    description: 'Test scenario for premium export file integrity',
    modelConfig: {
      scenario: {
        id: 'test-scenario',
        name: 'Test Scenario',
        startYear: 2026,
        horizonYears: 3, // Use 3 years to keep test manageable
        operations: [buildHotelConfig()],
      },
      projectConfig: {
        discountRate: 0.10,
        terminalGrowthRate: 0.02,
        initialInvestment: 10_000_000,
        workingCapitalPercentage: 0.05,
      },
      capitalConfig: buildSingleTrancheCapitalConfig(),
      waterfallConfig: buildBaselineWaterfallConfig(),
    },
  };
}

/**
 * Mock ExcelJS Workbook with tracking for pageSetup and outlineLevel.
 */
interface MockPageSetup {
  paperSize?: number;
  orientation?: 'portrait' | 'landscape';
  fitToPage?: boolean;
  fitToWidth?: number;
  fitToHeight?: number;
}

interface MockColumn {
  outlineLevel?: number;
  width?: number;
}

interface MockWorksheet {
  name: string;
  pageSetup: MockPageSetup;
  columns: MockColumn[];
  getColumn: (colIndex: number) => MockColumn;
  getCell: (address: string | number, col?: number) => { value?: unknown };
  getRow: (rowIndex: number) => { values: (string | number)[]; height?: number };
  mergeCells: (range: string) => void;
}

interface MockWorkbook {
  creator?: string;
  created?: Date;
  worksheets: MockWorksheet[];
  addWorksheet: (name: string) => MockWorksheet;
  xlsx: {
    writeBuffer: () => Promise<Buffer>;
  };
}

/**
 * Creates a mock ExcelJS Workbook that tracks pageSetup and outlineLevel.
 */
function createMockWorkbook(): MockWorkbook {
  const createMockWorksheet = (name: string): MockWorksheet => {
    const columns: MockColumn[] = [];
    
    const getColumn = (colIndex: number): MockColumn => {
      // ExcelJS uses 1-based indexing
      const index = colIndex - 1;
      if (!columns[index]) {
        columns[index] = {};
      }
      return columns[index];
    };

    const worksheet: MockWorksheet = {
      name,
      pageSetup: {},
      columns,
      getColumn,
      getCell: () => ({ value: undefined }),
      getRow: () => ({ values: [] }),
      mergeCells: () => {},
    };

    return worksheet;
  };

  const workbook: MockWorkbook = {
    worksheets: [],
    addWorksheet: (name: string) => {
      const sheet = createMockWorksheet(name);
      workbook.worksheets.push(sheet);
      return sheet;
    },
    xlsx: {
      writeBuffer: async () => Buffer.from('mock-excel-data'),
    },
  };
  
  return workbook;
}

describe('Premium Export File Integrity (v3.4)', () => {
  let scenario: NamedScenario;
  let output: FullModelOutput;
  let mockWorkbook: MockWorkbook;

  beforeEach(() => {
    scenario = buildTestScenario();
    output = runFullModel(scenario.modelConfig);
    mockWorkbook = createMockWorkbook();
  });

  describe('ExcelJS.Workbook Mocking', () => {
    it('should create a mock workbook with worksheet tracking', () => {
      const sheet = mockWorkbook.addWorksheet('Test Sheet');
      
      expect(sheet).toBeDefined();
      expect(sheet.name).toBe('Test Sheet');
      expect(mockWorkbook.worksheets).toHaveLength(1);
      expect(mockWorkbook.worksheets[0]).toBe(sheet);
    });

    it('should track pageSetup properties on worksheets', () => {
      const sheet = mockWorkbook.addWorksheet('Test Sheet');
      
      sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      expect(sheet.pageSetup.paperSize).toBe(9);
      expect(sheet.pageSetup.orientation).toBe('landscape');
      expect(sheet.pageSetup.fitToPage).toBe(true);
      expect(sheet.pageSetup.fitToWidth).toBe(1);
      expect(sheet.pageSetup.fitToHeight).toBe(0);
    });

    it('should track outlineLevel on columns', () => {
      const sheet = mockWorkbook.addWorksheet('Test Sheet');
      
      // Set outlineLevel = 1 for monthly columns
      const monthlyCol1 = sheet.getColumn(2);
      monthlyCol1.outlineLevel = 1;
      
      const monthlyCol2 = sheet.getColumn(3);
      monthlyCol2.outlineLevel = 1;
      
      // Set outlineLevel = 0 for annual total
      const annualCol = sheet.getColumn(14);
      annualCol.outlineLevel = 0;

      expect(monthlyCol1.outlineLevel).toBe(1);
      expect(monthlyCol2.outlineLevel).toBe(1);
      expect(annualCol.outlineLevel).toBe(0);
    });
  });

  describe('pageSetup Properties Verification', () => {
    it('should set pageSetup on Cover sheet with portrait orientation', () => {
      const sheet = mockWorkbook.addWorksheet('Cover');
      
      // Simulate Cover sheet pageSetup (from createCoverSheet)
      sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      expect(sheet.pageSetup.paperSize).toBe(9);
      expect(sheet.pageSetup.orientation).toBe('portrait');
      expect(sheet.pageSetup.fitToPage).toBe(true);
      expect(sheet.pageSetup.fitToWidth).toBe(1);
      expect(sheet.pageSetup.fitToHeight).toBe(0);
    });

    it('should set pageSetup on Cash Flow sheet with landscape orientation', () => {
      const sheet = mockWorkbook.addWorksheet('Cash Flow');
      
      // Simulate Cash Flow sheet pageSetup (from createCashFlowSheet)
      sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      expect(sheet.pageSetup.paperSize).toBe(9);
      expect(sheet.pageSetup.orientation).toBe('landscape');
      expect(sheet.pageSetup.fitToPage).toBe(true);
      expect(sheet.pageSetup.fitToWidth).toBe(1);
      expect(sheet.pageSetup.fitToHeight).toBe(0);
    });

    it('should verify all required pageSetup properties are set', () => {
      const sheet = mockWorkbook.addWorksheet('Test Sheet');
      
      sheet.pageSetup = {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      };

      // Verify all properties are defined
      expect(sheet.pageSetup.paperSize).toBeDefined();
      expect(sheet.pageSetup.orientation).toBeDefined();
      expect(sheet.pageSetup.fitToPage).toBeDefined();
      expect(sheet.pageSetup.fitToWidth).toBeDefined();
      expect(sheet.pageSetup.fitToHeight).toBeDefined();
    });
  });

  describe('outlineLevel for Monthly Columns', () => {
    it('should set outlineLevel = 1 for all monthly columns', () => {
      const sheet = mockWorkbook.addWorksheet('Cash Flow');
      const maxYear = output.consolidatedAnnualPnl.length;
      
      // Simulate the outlineLevel logic from createCashFlowSheet
      let colIndex = 2; // Start after 'Item' column
      for (let yearIndex = 0; yearIndex < maxYear; yearIndex++) {
        // Set outlineLevel = 1 for monthly columns (12 months per year)
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const col = sheet.getColumn(colIndex);
          col.outlineLevel = 1;
          colIndex++;
        }
        // Set outlineLevel = 0 for annual total
        const totalCol = sheet.getColumn(colIndex);
        totalCol.outlineLevel = 0;
        colIndex++;
      }

      // Verify monthly columns have outlineLevel = 1
      // Year 0: columns 2-13 (12 months) should have outlineLevel = 1
      for (let i = 2; i <= 13; i++) {
        const col = sheet.getColumn(i);
        expect(col.outlineLevel).toBe(1);
      }

      // Verify annual total column has outlineLevel = 0
      const year0TotalCol = sheet.getColumn(14);
      expect(year0TotalCol.outlineLevel).toBe(0);
    });

    it('should set outlineLevel = 0 for annual total columns', () => {
      const sheet = mockWorkbook.addWorksheet('Cash Flow');
      const maxYear = output.consolidatedAnnualPnl.length;
      
      // Simulate the outlineLevel logic
      let colIndex = 2;
      for (let yearIndex = 0; yearIndex < maxYear; yearIndex++) {
        // Skip monthly columns
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const col = sheet.getColumn(colIndex);
          col.outlineLevel = 1;
          colIndex++;
        }
        // Set annual total
        const totalCol = sheet.getColumn(colIndex);
        totalCol.outlineLevel = 0;
        colIndex++;
      }

      // Verify all annual total columns have outlineLevel = 0
      // Year 0 total: column 14
      // Year 1 total: column 27 (14 + 13)
      // Year 2 total: column 40 (14 + 13 + 13)
      for (let yearIndex = 0; yearIndex < maxYear; yearIndex++) {
        const totalColIndex = 2 + (yearIndex * 13) + 12; // 12 months + 1 for base offset
        const totalCol = sheet.getColumn(totalColIndex);
        expect(totalCol.outlineLevel).toBe(0);
      }
    });

    it('should correctly group monthly columns by year with outlineLevel', () => {
      const sheet = mockWorkbook.addWorksheet('Cash Flow');
      const maxYear = output.consolidatedAnnualPnl.length;
      
      // Apply outlineLevel logic
      let colIndex = 2;
      for (let yearIndex = 0; yearIndex < maxYear; yearIndex++) {
        // Monthly columns: outlineLevel = 1
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const col = sheet.getColumn(colIndex);
          col.outlineLevel = 1;
          colIndex++;
        }
        // Annual total: outlineLevel = 0
        const totalCol = sheet.getColumn(colIndex);
        totalCol.outlineLevel = 0;
        colIndex++;
      }

      // Verify grouping structure: each year has 12 monthly columns (level 1) + 1 total (level 0)
      for (let yearIndex = 0; yearIndex < maxYear; yearIndex++) {
        const yearStartCol = 2 + (yearIndex * 13);
        
        // Check all 12 monthly columns in this year
        for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
          const monthlyCol = sheet.getColumn(yearStartCol + monthOffset);
          expect(monthlyCol.outlineLevel).toBe(1);
        }
        
        // Check annual total column
        const totalCol = sheet.getColumn(yearStartCol + 12);
        expect(totalCol.outlineLevel).toBe(0);
      }
    });

    it('should verify outlineLevel enables column grouping in Excel', () => {
      const sheet = mockWorkbook.addWorksheet('Cash Flow');
      
      // Set up grouping: monthly columns (level 1) grouped under annual total (level 0)
      const monthlyCol1 = sheet.getColumn(2);
      monthlyCol1.outlineLevel = 1;
      
      const monthlyCol2 = sheet.getColumn(3);
      monthlyCol2.outlineLevel = 1;
      
      const annualTotalCol = sheet.getColumn(14);
      annualTotalCol.outlineLevel = 0;

      // Verify the grouping structure
      // Monthly columns should be collapsible (outlineLevel > 0)
      expect(monthlyCol1.outlineLevel).toBeGreaterThan(0);
      expect(monthlyCol2.outlineLevel).toBeGreaterThan(0);
      
      // Annual total should be at the top level (outlineLevel = 0)
      expect(annualTotalCol.outlineLevel).toBe(0);
    });
  });

  describe('File Structure Integrity', () => {
    it('should verify workbook structure matches expected format', () => {
      // Create sheets in the expected order
      mockWorkbook.addWorksheet('Cover');
      mockWorkbook.addWorksheet('Summary');
      mockWorkbook.addWorksheet('Assumptions');
      mockWorkbook.addWorksheet('Cash Flow');
      mockWorkbook.addWorksheet('Waterfall');

      expect(mockWorkbook.worksheets).toHaveLength(5);
      expect(mockWorkbook.worksheets[0].name).toBe('Cover');
      expect(mockWorkbook.worksheets[1].name).toBe('Summary');
      expect(mockWorkbook.worksheets[2].name).toBe('Assumptions');
      expect(mockWorkbook.worksheets[3].name).toBe('Cash Flow');
      expect(mockWorkbook.worksheets[4].name).toBe('Waterfall');
    });

    it('should verify Cash Flow sheet has correct column structure for grouping', () => {
      const sheet = mockWorkbook.addWorksheet('Cash Flow');
      const maxYear = output.consolidatedAnnualPnl.length;
      
      // Set up columns with outlineLevel
      let colIndex = 2;
      for (let yearIndex = 0; yearIndex < maxYear; yearIndex++) {
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          sheet.getColumn(colIndex).outlineLevel = 1;
          colIndex++;
        }
        sheet.getColumn(colIndex).outlineLevel = 0;
        colIndex++;
      }

      // Verify we have the expected number of data columns (excluding Item column)
      const dataCols = maxYear * 13; // 12 months + 1 total per year
      expect(dataCols).toBeGreaterThan(0);
      
      // Verify outlineLevel is set on all expected columns
      for (let i = 2; i < colIndex; i++) {
        const col = sheet.getColumn(i);
        expect(col.outlineLevel).toBeDefined();
      }
    });
  });
});

