# Tasks

- [x] Audit every admin table for kebab placement; find Reports as the lone right-aligned one
- [x] Reports: remove manual `key:'actions'` column; pass `renderRowActions` to `DataTable` (left sticky)
- [x] Confirm no table sets `actionsLeft={false}`; read-only tables have no actions
- [x] Verify kebab is leftmost + `sticky/left:0` + visible at mobile (390px) and desktop
- [x] tsc clean, build, deploy
- [x] Row-action dropdown opens RIGHT (left-0), not left, so it is fully on-screen next to the left-pinned kebab (DataTable + Reports menus)
