# @lace-lib/host-view-mode

The presentation-free half of a sandboxed guest's "default view mode" setting
(ADR 41 `lace.settings`): the availability gate, the label keys, and typed
read/write wrappers over the host record. A guest supplies its own sheet over
this — React Native in `apps/lace-extension-guest`, DOM in the carbon guest.
