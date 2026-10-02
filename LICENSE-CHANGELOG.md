# License Change Log

This log records changes to this repository's licensing documents. Draft entries
describe proposed terms; they do not independently grant permission.

## 2026-10-02 — Microsoft internal-use license, version 1.0 (draft)

- Added `LICENSE-MSFT-INTERNAL.md`, naming Ti-Chung Cheng as Licensor, for
  Microsoft Corporation, its subsidiaries, and contractors working solely on
  Microsoft's behalf.
- Set the term to July 1, 2026 through December 31, 2036, inclusive. These dates
  reflect the clarified request and replace the initial "ten years" description.
  Licensor approval would cover otherwise compliant use back to the start date.
- Permitted royalty-free internal use, including business decisions and product
  roadmaps supporting products or services Microsoft sells. No fees or royalties
  are payable to the Licensor for permitted use.
- Included first-party code, documentation, and assets, plus updates released
  during the term, only to the extent the Licensor can grant the relevant rights.
- Addressed internal copying, hosting, modification, contractor access, notices,
  patents, expiry, breach termination, and warranty/liability terms. Internal
  results may continue to be used after expiry; external distribution of the
  software and customer-facing hosting require independent permission.
- Preserved the existing public licenses and third-party license terms. The
  grant is non-exclusive; the Licensor remains free to license others.
- Added a draft-license reference to the README license section.
- Status: prepared for Licensor review; approval has not yet been recorded.

## 2026-10-02 — Version 1.0, draft revision 2 (review fixes)

- Specified dated written Licensor approval tied to the exact text through an
  attached copy or immutable repository revision. The issued copy and this log
  must record the version and Issue Date, separately from the July 1, 2026 start.
- Defined breach and termination notice recipients, delivery methods, and
  receipt evidence. Registered mail or tracked courier remains available even
  if email is unacknowledged, using Microsoft's designated postal address or,
  if none, its corporate headquarters, addressed to General Counsel. The
  32-calendar-day cure period begins the day after receipt. Unacknowledged email
  does not start that period.
- Added a surviving permission to retain, copy, inspect, and migrate restricted
  archives and backups for recordkeeping and legal compliance after expiry or
  termination, without operating or further developing the software.
- Distinguished continued use of independent survey results from use of covered
  documentation or assets copied into those results; those portions need an
  independent license for continued use or may be kept as archival records.
- Updated the README reference to identify revision 2. Royalty-free internal
  use, covered parties/materials, and the July 1, 2026–December 31, 2036 term
  remain as agreed. This revision does not add customer access.
- Reason: resolve the drafting review's approval, notice, and archival ambiguities.
- Status: revised draft prepared; not issued and no approval date recorded.

## 2026-10-02 — Version 1.0 (final text for signed-commit issuance)

- Incorporated the Licensor's edit selecting a GPG-signed commit on `main` as
  the issuance and approval record. Removed draft labels from the license and
  README; prior draft entries above remain as historical records.
- Replaced the separate written-approval/attachment process with the first
  qualifying commit containing the final license and this change-log entry,
  signed with the Licensor's OpenPGP key whose primary fingerprint is
  `55F6A803E46DEC07EB4142482AE8A0DED8FC30A7`. The commit signature approves the
  exact license text in its tree; no detached file signature is required.
- Defined the Issue Date as the UTC calendar date of that commit's committer
  timestamp. The signed commit records the date and immutable text without
  requiring its own commit ID to appear inside its tree.
- Preserved the July 1, 2026–December 31, 2036 term and all agreed substantive
  permissions and restrictions, including royalty-free internal commercial use.
- Status: final text; issuance and Issue Date are established by the qualifying
  signed commit under Section 3 of `LICENSE-MSFT-INTERNAL.md`.
