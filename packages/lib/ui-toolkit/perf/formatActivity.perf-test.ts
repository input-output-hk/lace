/**
 * measureFunction benchmark for formatAndGroupActivitiesByDate: the formatter
 * every platform's activity tab runs over the store's activities on each
 * refresh (format + date-grouping of N rows). Measurable since the fidelity
 * mocks: ActivityType and the amount/date formatters are the real production
 * modules. t() is backed by the real English copy, mirroring setup.perf.ts.
 */
import { measureFunction } from 'reassure';

// Namespace import + boundary exception: same rationale as setup.perf.ts.
// eslint-disable-next-line @nx/enforce-module-boundaries
import * as enJson from '../../../contract/i18n/src/translations/en.json';
import { formatAndGroupActivitiesByDate } from '../src';

import { makeActivities, tokensMetadataByTokenId } from './fixtures/activities';

import type { TFunction } from '@lace-contract/i18n';

const enMessages = enJson as unknown as Record<string, string>;
const t = ((key: string) => enMessages[key] ?? key) as unknown as TFunction;

const ROWS = 100;
const activities = makeActivities(ROWS);

// measureFunction reports count: 1 by construction, so these suites are
// informational for the gate (duration only). The assertion is their
// integrity check: a fixture that stops producing rows would otherwise
// measure an empty run.
test('formatAndGroupActivitiesByDate — 100 activities, pre-sorted', async () => {
  expect(
    formatAndGroupActivitiesByDate({
      activities,
      t,
      tokensMetadataByTokenId,
      preSorted: true,
    }),
  ).not.toHaveLength(0);

  await measureFunction(() =>
    formatAndGroupActivitiesByDate({
      activities,
      t,
      tokensMetadataByTokenId,
      preSorted: true,
    }),
  );
});

/** The unsorted path adds the internal descending sort the store skips. */
test('formatAndGroupActivitiesByDate — 100 activities, with sort', async () => {
  await measureFunction(() =>
    formatAndGroupActivitiesByDate({
      activities,
      t,
      tokensMetadataByTokenId,
    }),
  );
});
