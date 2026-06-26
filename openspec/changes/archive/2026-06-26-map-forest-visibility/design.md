## Design notes

### It was never a data bug
Ground truth from prod: `forests-map` returned 15/15, every row active and with
coordinates. So the fix is about **data validity** and **rendering**, not about
the query or a missing write. The create form already required coordinates and
`is_active` defaults TRUE — the gap was that nothing rejected *bad* coordinates,
and overlapping pins hid each other.

### Guard placement
The coordinate guard lives in the shared forest upsert handler, after `colMap`
is built and before the transaction opens. Create requires coords; any write
that *sets* coords is sanity-checked (so editing can't introduce garbage). The
`lat == lng` test specifically catches the most common field-entry error
(longitude pasted into both boxes), which produced the off-Africa "t" forest.

### Why jitter instead of only clustering
markercluster spiderfies overlapping markers on click, but at the default zoom a
stack still reads as one pin and the auto-fit can't separate them. A
deterministic golden-angle spiral (`angle = n·2.399963`, `radius = 0.0004·√n`,
~40 m) spreads duplicates into a small even rosette that stays stable across
re-renders (no randomness) and is visible without requiring a click. Popups bind
the real forest data; only the marker coordinate and the fit-bounds point are
offset.

### Cleanup is reversible
Junk forests were soft-deleted (`is_active=FALSE`), matching the app's
soft-delete convention, so any wrongly-removed forest can be restored by
flipping the flag — no hard delete of production rows.
