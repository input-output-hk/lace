// Words that never reach public text from this repository: internal
// trackers and their ticket references, chat, internal hosts and records, and
// names the public copy does not use. The developer site checks every page
// against them (apps/lace-sdk-site/scripts/copy-rules.mjs re-exports this
// list), and the SDK's release notes are checked against them before a
// release is created (scripts/release-notes-check.ts).
export const INTERNAL_TERMS = [
  // A ticket of the internal tracker: LW-123, LW 123, LW_123 or LW123.
  /\b(lw|lace)[\s_-]?\d{3,}\b/i,
  /\bslack\b/i,
  /\bjira\b/i,
  /atlassian|confluence/i,
  /localhost:5182/i,
  // The repository's design records are not published with the site.
  /\bADR[ -]?\d+\b/,
  /passkey-preview\./i,
  /\bLace platform\b/i,
  /\bLace's wallet capabilities\b/i,
];
