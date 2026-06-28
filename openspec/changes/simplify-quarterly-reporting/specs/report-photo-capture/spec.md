## MODIFIED Requirements

### Requirement: The inline report editor uploads photos instead of pasting URLs

The inline report-data editor SHALL let an operator upload (or capture) a photo for
each image field and store it via the existing slot-aware endpoint (`POST
/forest/:id/report-image`) rather than requiring a pasted URL. After a successful
upload the editor MUST reconcile the returned URL into its in-memory draft (by
re-fetching and merging) so a subsequent save cannot overwrite the uploaded image.
A pasted-URL fallback MAY remain for power users or when object storage is
unavailable.

#### Scenario: Upload a photo from the editor

- **WHEN** an operator picks a file (or takes a photo) for a report image field
- **THEN** it uploads to the field's slot, a thumbnail preview shows, the URL is
  written into the draft, and it survives the next save and renders on the
  matching slide

#### Scenario: Storage unavailable

- **WHEN** object storage is not configured (`storageReady()` false)
- **THEN** the upload control reports it clearly and the URL-paste fallback remains
  available, instead of a silent failure
