/**
 * Grid of Box cards rendered in the Grid Config step (spec flow: "renders a grid
 * of Box cards (rows x cols); each card opens EditBoxDialog").
 *
 * - Grid is box_rows x box_column. Each cell is a clickable card showing
 *   'Row R • Column C', capacity (= tree_row * tree_column), Planted, Remaining.
 * - Clicking a card opens EditBoxDialog for that cell. On Done, the box config
 *   is committed to the wizard's `boxes` map (keyed `${row}-${col}`).
 * - `Start` is auto-calculated when a box is first opened: previous box's
 *   (start + capacity), defaulting to 1 for the first box. Box ordering for the
 *   running number is row-major (left-to-right, top-to-bottom). The user can
 *   override Start in the dialog (spec: "Start ... auto-calculated").
 */
import { useMemo, useState } from 'react';
import { EditBoxDialog } from './EditBoxDialog';
import {
  boxCapacity,
  boxKey,
  boxPlanted,
  emptyBox,
  type BoxConfig,
  type ForestFormState,
} from './types';

export interface BoxGridProps {
  boxRows: number;
  boxColumn: number;
  treeRow: number;
  treeColumn: number;
  boxes: ForestFormState['boxes'];
  onChange: (boxes: ForestFormState['boxes']) => void;
}

/** Row-major ordered list of all (row,col) cells, 1-based. */
function cells(boxRows: number, boxColumn: number): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  for (let r = 1; r <= boxRows; r += 1) {
    for (let c = 1; c <= boxColumn; c += 1) out.push({ row: r, col: c });
  }
  return out;
}

export function BoxGrid({
  boxRows,
  boxColumn,
  treeRow,
  treeColumn,
  boxes,
  onChange,
}: BoxGridProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const capacity = boxCapacity(treeRow, treeColumn);
  const orderedCells = useMemo(() => cells(boxRows, boxColumn), [boxRows, boxColumn]);

  if (boxRows <= 0 || boxColumn <= 0) {
    return (
      <p className="rounded-card border border-dashed border-border bg-appbg px-3 py-6 text-center text-sm text-textSecondary">
        Enter valid Box Rows and Box Column to generate the box grid.
      </p>
    );
  }

  /** Auto-calc the next Start for a freshly opened box = prev box end + 1. */
  const computeStart = (target: { row: number; col: number }): string => {
    let running = 1;
    for (const cell of orderedCells) {
      if (cell.row === target.row && cell.col === target.col) break;
      const b = boxes[boxKey(cell.row, cell.col)];
      // Advance by this box's capacity (each box occupies `capacity` numbers).
      const startNum = b && b.start.trim() !== '' ? Number(b.start) : running;
      const base = Number.isFinite(startNum) ? startNum : running;
      running = base + capacity;
    }
    return String(running);
  };

  const openBox = (row: number, col: number) => {
    const key = boxKey(row, col);
    if (!boxes[key]) {
      // Seed a fresh box with the auto-calculated Start.
      const seeded: BoxConfig = { ...emptyBox(row, col), start: computeStart({ row, col }) };
      onChange({ ...boxes, [key]: seeded });
    }
    setOpenKey(key);
  };

  const commitBox = (box: BoxConfig) => {
    onChange({ ...boxes, [boxKey(box.row, box.col)]: box });
    setOpenKey(null);
  };

  const openBoxConfig = openKey ? boxes[openKey] ?? null : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-textPrimary">Boxes</h3>
        <span className="text-label text-textSecondary">
          {boxRows * boxColumn} boxes • capacity {capacity} each
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${boxColumn}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Box grid"
      >
        {orderedCells.map(({ row, col }) => {
          const key = boxKey(row, col);
          const box = boxes[key];
          const planted = boxPlanted(box);
          const remaining = capacity - planted;
          const configured = Boolean(box && box.prefix.trim());
          const over = remaining < 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => openBox(row, col)}
              className={`flex flex-col gap-1 rounded-card border p-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                configured
                  ? 'border-primary bg-primary/5 hover:bg-primary/10'
                  : 'border-border bg-surface hover:bg-black/[0.03]'
              }`}
              aria-label={`Edit box Row ${row} Column ${col}, ${planted} of ${capacity} planted`}
            >
              <span className="text-label font-medium text-textPrimary">
                Row {row} • Column {col}
              </span>
              {configured && box ? (
                <span className="text-label text-textSecondary">
                  Prefix {box.prefix}
                </span>
              ) : null}
              <span className="mt-auto flex flex-wrap gap-x-2 text-label text-textSecondary">
                <span>Cap {capacity}</span>
                <span>Planted {planted}</span>
                <span className={over ? 'text-danger' : undefined}>Rem {remaining}</span>
              </span>
            </button>
          );
        })}
      </div>

      <EditBoxDialog
        open={Boolean(openKey)}
        box={openBoxConfig}
        treeRow={treeRow}
        treeColumn={treeColumn}
        onCancel={() => setOpenKey(null)}
        onDone={commitBox}
      />
    </div>
  );
}
