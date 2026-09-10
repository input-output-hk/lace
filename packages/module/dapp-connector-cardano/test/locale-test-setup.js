// Shared implementation lives in @lace-lib/util-dev, this file only wires it
// into the package's vitest run.
import { pinDefaultNumberLocale } from '@lace-lib/util-dev';

// This suite asserts formatted numbers, whose separators otherwise follow the
// machine's locale and go red on a non-English one.
pinDefaultNumberLocale();
