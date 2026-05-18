/** Serializes a 2D string matrix to CSV with RFC-style quoting. */
export function toCSVString(data: string[][]): string {
  return data
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        })
        .join(','),
    )
    .join('\n')
}

/** Serializes a 2D string matrix to tab-separated lines. */
export function toTSVString(data: string[][]): string {
  return data.map((row) => row.join('\t')).join('\n')
}

/**
 * Builds a JSON array of row objects using string headers as keys.
 * @param pretty - Pretty-print with indentation when true.
 * @default true
 */
export function toJSONString(
  headers: string[],
  rows: string[][],
  pretty = true,
): string {
  const objects = rows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? ''
    })
    return obj
  })
  return pretty ? JSON.stringify(objects, null, 2) : JSON.stringify(objects)
}

/**
 * Triggers a CSV file download in the browser.
 * @default filename `'export.csv'`
 */
export function downloadCSV(content: string, filename = 'export.csv'): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Triggers a JSON file download in the browser.
 * @default filename `'export.json'`
 */
export function downloadJSON(content: string, filename = 'export.json'): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Copies text using the Clipboard API when available. */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
  }
}

/** Opens a print dialog with the table DOM and current document styles. */
export function printTable(tableEl: HTMLElement | null): void {
  if (!tableEl) return
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n')

  printWindow.document.write(`<!DOCTYPE html><html><head>${styles}
    <style>
      body { padding: 20px; }
      .sg-table-toolbar, .sg-table-pagination, .sg-table-selection-bar { display: none !important; }
      .sg-table-wrapper { overflow: visible !important; }
      .sg-table-scroll { overflow: visible !important; max-height: none !important; }
      @media print { @page { size: landscape; margin: 1cm; } }
    </style>
  </head><body>${tableEl.outerHTML}</body></html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}
