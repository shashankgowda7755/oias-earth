/**
 * Generic, server-paginated data table (spec DataTable).
 *
 * Layout matches the screenshot: a white card containing
 *   - toolbar: SearchBar (left)  +  [toolbar slot] AddButton/FilterButton (right)
 *   - table with sticky-styled header (#eef1f3 bg, 14px/600 headers)
 *   - states: loading (centered spinner), error, empty
 *   - footer: "Rows per page" select (default 10) + numbered pagination w/ prev/next
 *
 * Pagination is server-side: the component is told `total`, `page`, `limit`
 * and reports user intent back through onPageChange / onLimitChange. It never
 * slices rows itself.
 *
 * Search is controlled + debounced here: the parent passes the committed
 * `search` value and gets debounced updates via onSearch.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Spinner } from './Spinner';

export interface Column<T> {
  /** stable key; also used as React key for the cell. */
  key: string;
  header: ReactNode;
  /** custom cell renderer; falls back to (row as any)[key] when omitted. */
  render?: (row: T, rowIndex: number) => ReactNode;
  /** optional Tailwind classes for the <td>/<th> (e.g. text-right, w-40). */
  className?: string;
  /** optional header-cell-only classes. */
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** stable row id for React keys. Default: row.id ?? index. */
  getRowId?: (row: T, index: number) => string | number;

  loading?: boolean;
  /** error message; when set, the error state replaces the table body. */
  error?: string | null;
  /** custom empty-state node; defaults to "No records found.". */
  emptyContent?: ReactNode;

  /* pagination (server-side) */
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  rowsPerPageOptions?: number[];

  /* search */
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  /** debounce window in ms for onSearch. Default 350. */
  searchDebounceMs?: number;

  /** right-aligned toolbar slot (AddButton + FilterButton live here). */
  toolbar?: ReactNode;

  /** optional accessible caption for the table. */
  caption?: string;

  /** when set, clicking a row (outside interactive cells) calls this. */
  onRowClick?: (row: T) => void;

  /* --- row actions (kebab menu: View / Edit / Delete) ---
   * Providing ANY of these adds a trailing actions column with a kebab (⋮)
   * menu. Each item appears only when its handler is given. Per the live site
   * (spec/write_contracts.md "Row actions") the menu is View / Edit / Delete.
   *
   * Delete is destructive: the table just CALLS `onDelete(row)`; the page is
   * expected to open a <ConfirmDialog variant="danger"> and run the delete
   * mutation there (the table stays stateless about the actual write). */
  onView?: (row: T, rowIndex: number) => void;
  onEdit?: (row: T, rowIndex: number) => void;
  onDelete?: (row: T, rowIndex: number) => void;
  /** Header text for the actions column. Default '' (screen-reader only). */
  actionsHeader?: ReactNode;
  /**
   * Escape hatch to render fully custom row actions instead of the default
   * View/Edit/Delete kebab. Receives the row; you render whatever control(s).
   * When provided, onView/onEdit/onDelete are ignored.
   */
  renderRowActions?: (row: T, rowIndex: number) => ReactNode;
  /** Place the actions (⋮) column on the LEFT, pinned sticky so it's always
   *  reachable without horizontal-scrolling a wide table. Default true. */
  actionsLeft?: boolean;
}

const DEFAULT_ROWS_PER_PAGE = [10, 25, 50, 100];

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  error = null,
  emptyContent,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE,
  search,
  onSearch,
  searchPlaceholder = 'Search...',
  searchDebounceMs = 350,
  toolbar,
  caption,
  onView,
  onEdit,
  onDelete,
  actionsHeader = '',
  renderRowActions,
  onRowClick,
  actionsLeft = true,
}: DataTableProps<T>) {
  const searchId = useId();
  // An actions column is shown when a custom renderer or any handler is given.
  const hasActions =
    Boolean(renderRowActions) ||
    Boolean(onView) ||
    Boolean(onEdit) ||
    Boolean(onDelete);
  const colCount = columns.length + (hasActions ? 1 : 0);
  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // --- debounced search input (controlled by parent's committed value) ---
  const [searchInput, setSearchInput] = useState(search ?? '');
  const isFirstSearchRun = useRef(true);

  // keep local input in sync if parent resets the committed value
  useEffect(() => {
    setSearchInput(search ?? '');
  }, [search]);

  useEffect(() => {
    if (!onSearch) return;
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      if (searchInput !== (search ?? '')) onSearch(searchInput);
    }, searchDebounceMs);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, searchDebounceMs]);

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  return (
    <div className="rounded-card bg-surface shadow-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {onSearch ? (
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor={searchId} className="sr-only">
              {searchPlaceholder}
            </label>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">
              <SearchIcon />
            </span>
            <input
              id={searchId}
              type="search"
              value={searchInput}
              placeholder={searchPlaceholder}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-button border border-border bg-surface py-2 pl-9 pr-3 text-sm text-textPrimary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        ) : (
          <div />
        )}
        {toolbar ? <div className="flex items-center gap-2">{toolbar}</div> : null}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="bg-tableHeader">
              {hasActions && actionsLeft ? (
                <th
                  scope="col"
                  className="sticky left-0 z-20 bg-tableHeader px-4 py-3 text-left text-tableHeader font-semibold text-textPrimary"
                >
                  {actionsHeader === '' ? <span className="sr-only">Actions</span> : actionsHeader}
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-tableHeader font-semibold text-textPrimary ${col.headerClassName ?? ''} ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
              {hasActions && !actionsLeft ? (
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-tableHeader font-semibold text-textPrimary"
                >
                  {actionsHeader === '' ? (
                    <span className="sr-only">Actions</span>
                  ) : (
                    actionsHeader
                  )}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="py-16">
                  <div className="flex items-center justify-center">
                    <Spinner size={32} />
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colCount} className="py-16">
                  <div className="flex flex-col items-center justify-center gap-1 text-center">
                    <span className="font-medium text-danger">Failed to load data</span>
                    <span className="text-sm text-textSecondary">{error}</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-16">
                  <div className="flex items-center justify-center text-sm text-textSecondary">
                    {emptyContent ?? 'No records found.'}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const id = getRowId
                  ? getRowId(row, rowIndex)
                  : ((row as { id?: string | number }).id ?? rowIndex);
                return (
                  <tr
                    key={id}
                    className={`border-t border-border hover:bg-black/[0.02] ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={
                      onRowClick
                        ? (e) => {
                            // Ignore clicks that land on interactive controls
                            // (kebab menu, buttons, links, inputs) — let those run.
                            if ((e.target as HTMLElement).closest('button, a, input, select, [role="menu"], [role="menuitem"]')) return;
                            onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {hasActions && actionsLeft ? (
                      <td className="sticky left-0 z-10 bg-surface px-4 py-3 align-middle text-left">
                        {renderRowActions ? (
                          renderRowActions(row, rowIndex)
                        ) : (
                          <RowActionsMenu
                            onView={onView ? () => onView(row, rowIndex) : undefined}
                            onEdit={onEdit ? () => onEdit(row, rowIndex) : undefined}
                            onDelete={onDelete ? () => onDelete(row, rowIndex) : undefined}
                          />
                        )}
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 align-middle text-textPrimary ${col.className ?? ''}`}
                      >
                        {col.render
                          ? col.render(row, rowIndex)
                          : renderDefaultCell(row, col.key)}
                      </td>
                    ))}
                    {hasActions && !actionsLeft ? (
                      <td className="px-4 py-3 align-middle text-right">
                        {renderRowActions ? (
                          renderRowActions(row, rowIndex)
                        ) : (
                          <RowActionsMenu
                            onView={onView ? () => onView(row, rowIndex) : undefined}
                            onEdit={onEdit ? () => onEdit(row, rowIndex) : undefined}
                            onDelete={onDelete ? () => onDelete(row, rowIndex) : undefined}
                          />
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: rows-per-page + pagination */}
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-textSecondary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor={`${searchId}-rpp`}>Rows per page</label>
          <select
            id={`${searchId}-rpp`}
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-button border border-border bg-surface py-1.5 pl-2 pr-7 text-textPrimary outline-none focus:border-primary"
          >
            {rowsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline">
            {rangeStart}-{rangeEnd} of {total}
          </span>
        </div>

        <Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

function renderDefaultCell<T>(row: T, key: string): ReactNode {
  const value = (row as Record<string, unknown>)[key];
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/* ----------------------------- Pagination ----------------------------- */

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const pages = pageWindow(page, pageCount);
  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <PageButton
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        ariaLabel="Previous page"
      >
        ‹
      </PageButton>
      {pages.map((p, i) =>
        p === ELLIPSIS ? (
          <span key={`e${i}`} className="px-2 text-textSecondary" aria-hidden="true">
            …
          </span>
        ) : (
          <PageButton
            key={p}
            onClick={() => onPageChange(p)}
            active={p === page}
            ariaLabel={`Page ${p}`}
            ariaCurrent={p === page}
          >
            {p}
          </PageButton>
        ),
      )}
      <PageButton
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        ariaLabel="Next page"
      >
        ›
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
  ariaCurrent,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
  ariaCurrent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? 'page' : undefined}
      className={`flex h-8 min-w-8 items-center justify-center rounded-button px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-primary text-white'
          : 'text-textPrimary hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

const ELLIPSIS = -1;

/** Build a compact page list: 1 … (p-1) p (p+1) … N. */
function pageWindow(page: number, pageCount: number): number[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages: number[] = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(pageCount - 1, page + 1);
  if (left > 2) pages.push(ELLIPSIS);
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < pageCount - 1) pages.push(ELLIPSIS);
  pages.push(pageCount);
  return pages;
}

function SearchIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/* ----------------------------- Row actions menu ----------------------------- */
/**
 * Kebab (⋮) button that opens a small popover with View / Edit / Delete items.
 * Each item renders only when its callback is supplied. Closes on outside
 * click, Escape, or after an item fires. Delete is styled as destructive; the
 * caller is responsible for the ConfirmDialog + delete mutation.
 */
function RowActionsMenu({
  onView,
  onEdit,
  onDelete,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn?: () => void) => {
    setOpen(false);
    fn?.();
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-textSecondary transition-colors hover:bg-white/5 hover:text-textPrimary"
      >
        <KebabIcon />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-input border border-border bg-surface py-1 text-left shadow-dialog"
        >
          {onView ? (
            <MenuItem onClick={() => run(onView)}>View</MenuItem>
          ) : null}
          {onEdit ? (
            <MenuItem onClick={() => run(onEdit)}>Edit</MenuItem>
          ) : null}
          {onDelete ? (
            <MenuItem onClick={() => run(onDelete)} danger>
              Delete
            </MenuItem>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
        danger ? 'text-danger' : 'text-textPrimary'
      }`}
    >
      {children}
    </button>
  );
}

function KebabIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
