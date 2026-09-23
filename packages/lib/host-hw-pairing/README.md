# @lace-lib/host-hw-pairing

The presentation-free half of a sandboxed guest's hardware-wallet pairing entry
(ADR 44): which devices and blockchains the host can pair, and whether its
pairing window is still open. A guest supplies its own picker UI over this —
React Native in `apps/lace-extension-guest`, DOM in the carbon guest.
