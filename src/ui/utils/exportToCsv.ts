/**
 * CSV export utility (v0.6).
 * 
 * Converts data to CSV format and triggers browser download.
 */

/**
 * Converts a 2D array of data to CSV string.
 */
function arrayToCsv(data: (string | number)[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Exports data to CSV file and triggers browser download.
 * 
 * @param data - 2D array where first row is headers, subsequent rows are data
 * @param filename - Name of the file to download (without .csv extension)
 */
export function exportToCsv(data: (string | number)[][], filename: string): void {
  try {
    const csv = arrayToCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export CSV:', e);
    alert('Failed to export CSV. Please check the console for details.');
  }
}

/**
 * Exports scenario summary data to CSV.
 * 
 * @param summaries - Array of scenario summaries to export (from buildScenarioSummary)
 */
export function exportScenarioSummariesToCsv(summaries: Array<{
  scenarioId: string;
  scenarioName: string;
  projectKpis: {
    npv: number;
    unleveredIrr: number | null;
    equityMultiple: number;
    paybackPeriod: number | null;
  };
  capitalKpis: {
    avgDscr: number | null;
    finalLtv: number | null;
    totalDebtService: number;
    totalDebtPrincipal: number;
  };
  waterfallKpis: Array<{
    partnerId: string;
    partnerName: string;
    irr: number | null;
    moic: number;
  }>;
}>): void {
  const rows: (string | number)[][] = [];
  
  // Header row
  rows.push([
    'Scenario',
    'NPV',
    'IRR',
    'MoIC',
    'Payback (years)',
    'Avg DSCR',
    'Final LTV',
    'Partner',
    'Partner IRR',
    'Partner MoIC',
  ]);
  
  // Data rows (one row per partner per scenario)
  summaries.forEach((summary) => {
    if (summary.waterfallKpis.length === 0) {
      // If no partners, still add a row with scenario data
      rows.push([
        summary.scenarioName,
        summary.projectKpis.npv,
        summary.projectKpis.unleveredIrr ?? 'N/A',
        summary.projectKpis.equityMultiple,
        summary.projectKpis.paybackPeriod ?? 'N/A',
        summary.capitalKpis.avgDscr ?? 'N/A',
        summary.capitalKpis.finalLtv ?? 'N/A',
        'N/A',
        'N/A',
        'N/A',
      ]);
    } else {
      summary.waterfallKpis.forEach((kpi) => {
        rows.push([
          summary.scenarioName,
          summary.projectKpis.npv,
          summary.projectKpis.unleveredIrr ?? 'N/A',
          summary.projectKpis.equityMultiple,
          summary.projectKpis.paybackPeriod ?? 'N/A',
          summary.capitalKpis.avgDscr ?? 'N/A',
          summary.capitalKpis.finalLtv ?? 'N/A',
          kpi.partnerId.toUpperCase(),
          kpi.irr ?? 'N/A',
          kpi.moic,
        ]);
      });
    }
  });
  
  exportToCsv(rows, `scenario-comparison-${new Date().toISOString().split('T')[0]}`);
}

