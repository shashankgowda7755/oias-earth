> Status: code implemented and pushed in commit `05026db`; prod data cleanup
> applied. Checked items reflect completed work; recorded as the spec of record.

## 1. Diagnosis

- [x] 1.1 Confirm `/public/forests-map` returns all active forests with coords (prod: 15/15, 0 missing)
- [x] 1.2 Confirm create form requires coords + `is_active` defaults TRUE — no data-loss bug
- [x] 1.3 Identify real causes: garbage coords drag the viewport; identical coords stack

## 2. Create-time coordinate guard

- [x] 2.1 New forests must carry `forest_geo_lat` + `forest_geo_long`
- [x] 2.2 Reject garbage on any coord write: blank, `0/0`, `lat==lng`, `|lat|>90`, `|lng|>180`
- [x] 2.3 Return `400` (`badRequest`) with a clear message

## 3. De-stack overlapping pins

- [x] 3.1 `HeartbeatMap.tsx`: golden-angle spiral jitter (~40 m × √n) for duplicate coordinates
- [x] 3.2 `PublicMap.tsx`: same jitter; fit-bounds uses jittered points
- [x] 3.3 Keep `spiderfyOnMaxZoom` clustering; popups still show real (un-jittered) data

## 4. Data cleanup

- [x] 4.1 Soft-delete 7 junk test forests with bogus coords (`is_active=FALSE`, reversible)
- [x] 4.2 Verify remaining pins all fall within a sane India bounding box

## 5. Build + ship

- [x] 5.1 `tsc --noEmit` passes for client and server
- [x] 5.2 Commit + push to `main` (`05026db`)
- [x] 5.3 Live-verify on `/map` and dashboard (user confirmed: "DONE TESTED")

## 6. Follow-up (open)

- [ ] 6.1 Decide on 2 borderline forests still on the map: `QA Test Forest`
      (100 trees) and `CGI - Bangalore University` (0 trees, dup coords of
      "Bangalore University") — keep or soft-delete
