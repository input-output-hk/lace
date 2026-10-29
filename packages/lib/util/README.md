# @lace-lib/util

General-purpose utilities for the platform's libraries, in two entries:

- `@lace-lib/util`: value objects, `Result` from `ts-results-es`, the app logger and shared types.
- `@lace-lib/util/common`: the general-purpose utilities ported from cardano-js-sdk's `@cardano-sdk/util` (see
  `NOTICE`), published as `@laceio/cardano/util`. It imports no other platform package, RxJS or `ts-results-es`, so
  a published package can inline it on its own.
