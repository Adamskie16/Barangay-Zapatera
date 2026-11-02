// Admin/src/core/exportToCsv.ts
// Enterprise CSV Export Utility with RFC 4180 Escaping, UTF-8 BOM, and Memory-Safe Blob Download

export interface CsvColumn<T = any> {
  header: string;
  key: string;
  accessor?: (item: T, index: number) => string | number | boolean | null | undefined;
}

/**
 * Formats an ISO timestamp or Date into a clean human-readable local string: YYYY-MM-DD HH:mm:ss
 */
export function formatCsvTimestamp(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Cleans currency/number values (strips ₱, commas, spaces) into standard 2-decimal format (e.g. "500.00")
 * so Microsoft Excel treats the column as numeric rather than broken text.
 */
export function formatCsvDecimal(value: unknown): string {
  if (value === null || value === undefined || value === '') return '0.00';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }
  const cleaned = String(value).replace(/[₱,\s]/g, '').trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

/**
 * Escapes a single CSV cell value according to RFC 4180:
 * - Null / undefined values become empty strings "" (never "null" or "undefined")
 * - Internal double quotes are doubled (" -> "")
 * - Strings containing commas, double quotes, or line breaks are wrapped in double quotes
 */
export function escapeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') {
    if (raw instanceof Date) {
      return formatCsvTimestamp(raw);
    }
    try {
      const serialized = JSON.stringify(raw);
      if (!serialized || serialized === '{}' || serialized === '[]') return '';
      const escaped = serialized.replace(/"/g, '""');
      return `"${escaped}"`;
    } catch {
      return '';
    }
  }

  const str = String(raw);
  if (str === 'null' || str === 'undefined') return '';

  const needsQuotes = /[",\r\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Generic TypeScript utility function that exports an array of records to a UTF-8 BOM CSV file.
 * Supports:
 *   exportToCsv(filename, columns, data)
 * Returns the number of exported data rows.
 */
export function exportToCsv<T = Record<string, any>>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): number {
  const safeData = Array.isArray(data) ? data : [];
  const effectiveColumns: CsvColumn<T>[] =
    Array.isArray(columns) && columns.length > 0
      ? columns
      : safeData.length > 0 && typeof safeData[0] === 'object' && safeData[0] !== null
      ? Object.keys(safeData[0] as Record<string, any>).map((k) => ({
          header: k,
          key: k,
        }))
      : [];

  if (effectiveColumns.length === 0) {
    return 0;
  }

  const separator = ',';
  const headerLine = effectiveColumns.map((col) => escapeCsvCell(col.header)).join(separator);

  const dataLines = safeData.map((item, rowIndex) =>
    effectiveColumns
      .map((col) => {
        let rawValue: unknown;
        if (typeof col.accessor === 'function') {
          rawValue = col.accessor(item, rowIndex);
        } else if (item && typeof item === 'object' && col.key in (item as Record<string, any>)) {
          rawValue = (item as Record<string, any>)[col.key];
        } else {
          rawValue = '';
        }
        return escapeCsvCell(rawValue);
      })
      .join(separator)
  );

  // Prefix with UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    const cleanFilename = String(filename || 'Barangay_Zapatera_Export')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '');
    const finalFilename = cleanFilename.toLowerCase().endsWith('.csv')
      ? cleanFilename
      : `${cleanFilename}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Immediately revoke object URL on next tick to prevent memory leaks
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return safeData.length;
}

export default exportToCsv;
