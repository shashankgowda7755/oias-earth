---
name: quarterly-session
description: Automates the 10-minute quarterly data entry session for a CommuniTree forest report. Navigates the prod app, auto-fills API-driven fields, collects manual values from the operator, fills the form, previews slides, and sends.
license: MIT
compatibility: Requires access to https://communitree-rebuild.vercel.app and preview browser tools.
metadata:
  author: communitree
  version: "1.0"
---

## Usage

```
/quarterly-session <forest_internal_id> <year> <Q1|Q2|Q3|Q4>
```

**Example:**
```
/quarterly-session CGICGI57 2026 Q3
```

---

## Step 1 — Setup

Parse the three positional arguments:
- `forest_id` — the forest's internal ID (e.g. `CGICGI57`)
- `year` — four-digit year (e.g. `2026`)
- `quarter` — one of `Q1`, `Q2`, `Q3`, `Q4`; extract the number (1–4)

Tell the operator:

```
Starting Q{n} {year} session for {forest_id}.
Make sure you're logged into https://communitree-rebuild.vercel.app
```

Use the preview browser tools to open the prod URL:
```
https://communitree-rebuild.vercel.app
```

Take a screenshot to confirm the app loaded and the operator is logged in. If the login screen is shown, stop and ask the operator to log in, then re-run.

---

## Step 2 — Find the forest

1. Navigate to `/forests` (or `/dashboard` if `/forests` does not exist).
2. Search for `{forest_id}` using the search/filter on the page.
3. Click the matching forest row or card to open its detail view.
4. Locate the **Report Data** tab and click it.
5. Use the year + quarter picker to select `{year}` and `Q{n}`.
6. Screenshot and confirm you are on the correct quarter's data entry view before proceeding.

If the forest is not found, stop and report:
```
Forest {forest_id} not found. Check the ID and try again.
```

---

## Step 3 — Auto-fill (API-driven fields)

Run both auto-fills in sequence:

1. **Area & Population section** — find the button labeled "⚡ Auto-fill from city name" (or similar). Click it. Wait for the fill to complete (spinner stops or success toast appears).
2. **Quarterly section** — find the button labeled "⚡ Auto-fill weather" (or similar). Click it. Wait for completion.

After both complete:
- Take a screenshot of the filled sections.
- Note which fields were populated (city name, population, temperature, rainfall, etc.).
- If a button is absent or disabled, note it and continue — do not fail the session.

Report to the operator:
```
Auto-fill complete. Filled: [list fields]. 
```

---

## Step 4 — Collect delta fields from operator

Ask the operator ONE question covering all manual fields. Do not ask field by field. Present this block exactly:

```
I need values for Q{n} {year} — please provide all of these:

1. Inside plantation temperature (°C):
2. Inside humidity (%):
3. Soil pH reading:
4. Full-time gardeners this quarter:
5. Part-time gardeners + days each worked (e.g. "3 gardeners × 12 days"):
6. Watering days this quarter:
7. Current plant height range (e.g. "2–3 feet"):

Also: have 2 photos ready to upload when prompted —
  - Gallery photo (wide shot)
  - Plantation progress photo (close-up or growth shot)
```

Wait for the operator's reply before continuing.

---

## Step 5 — Fill fields

Use the values from Step 4. Navigate to each section and enter the values into the correct fields:

| Section | Field | Value source |
|---|---|---|
| Quarterly measurements | Inside plantation temperature | Answer 1 |
| Quarterly measurements | Inside humidity | Answer 2 |
| Soil | pH reading | Answer 3 |
| Workforce | Full-time gardeners | Answer 4 |
| Workforce | Part-time gardeners / days worked | Answer 5 |
| Irrigation | Watering days | Answer 6 |
| Growth | Plant height range | Answer 7 |

After filling each section, take a brief screenshot to confirm values are saved (look for auto-save indicator or green checkmarks).

**Photos (Media section):**
1. Locate the Media / Photos section.
2. For each upload field (gallery photo, plantation progress photo), use the file upload interaction to upload the operator's photos. Prompt the operator one photo at a time if the uploader requires it.
3. Confirm upload success before moving on.

---

## Step 6 — Preview + Send

1. Find and click the **Report Preview** button (or navigate to the preview URL for this forest/quarter).
2. Screenshot the following slides specifically (these historically had gaps):
   - Slide 15
   - Slide 16
   - Slide 17
   - Slide 20
3. Show the screenshots to the operator and ask:

```
Here are slides 15, 16, 17, and 20.
Does the report look correct? 

Type YES to send, or NO to go back and fix something.
```

4. If the operator types **NO**: ask which slide or field needs fixing, navigate back, apply the fix, then re-run Step 6.
5. If the operator types **YES**: navigate to the **Send** button, click it, and confirm the send action in any confirmation dialog.

---

## Step 7 — Done

Report a summary to the operator:

```
Q{n} {year} report for {forest_id} — SENT

Auto-filled:
  - [list fields filled by auto-fill buttons]

Manually entered:
  - Inside temp: {value}
  - Inside humidity: {value}
  - Soil pH: {value}
  - Full-time gardeners: {value}
  - Part-time gardeners/days: {value}
  - Watering days: {value}
  - Plant height range: {value}
  - Photos: gallery + plantation progress uploaded

Send status: [success message or error from app]
```

Suggest a git commit message for the operator:
```
data: Q{n} {year} report for {forest_id}
```

---

## Error handling

- **Not logged in**: Stop at Step 1, ask operator to log in.
- **Forest not found**: Stop at Step 2, report the ID and ask to verify.
- **Auto-fill button missing**: Skip silently, note in Step 3 report.
- **Auto-fill returns error**: Note the error, continue with manual entry for those fields.
- **Send fails**: Screenshot the error, report to operator, do not retry automatically.
- **Upload fails**: Report which photo failed, ask operator to try again or skip.

---

## Notes

- The prod URL is always `https://communitree-rebuild.vercel.app` — never use a local or staging URL.
- Auto-save is field-level; no explicit "Save" button is needed between sections.
- If the quarter picker shows a lock icon, the report may already be sent — confirm with operator before overwriting.
- Slides 15, 16, 17, 20 cover: plantation area, population served, environmental measurements, and workforce — the four data-dense slides.
