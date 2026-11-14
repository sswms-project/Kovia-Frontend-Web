/** `table`: always a table. `cards-*`: stacked cards below the panel width the columns need. */
export type AiTableLayout = 'table' | 'cards-narrow' | 'cards-wide'

/** Up to 3 columns fit any panel width; 4–5 need a ~32rem panel; 6+ need a ~42rem panel. */
export function getAiTableLayout(columnCount: number): AiTableLayout {
  if (columnCount <= 3) return 'table'
  return columnCount <= 5 ? 'cards-narrow' : 'cards-wide'
}

const NUMERIC_CELL = /^[-+]?[\d.,\s]+%?$/

/** A column whose filled cells are all numbers is right-aligned with tabular figures. */
export function isAiNumericColumn(rows: readonly (readonly string[])[], column: number): boolean {
  const cells = rows.map((row) => (row[column] ?? '').trim()).filter(Boolean)
  return cells.length > 0 && cells.every((cell) => NUMERIC_CELL.test(cell))
}
