/**
 * ActivityList render cost at production fidelity: 100 pre-formatted rows
 * grouped into date sections, rendered through ui-toolkit's ActivityList
 * template (date tags + activity cards over FlashList) — the shared organism
 * every platform's activity tab renders. Sections are built in the fixture,
 * not by any app's formatter, so this measures the template alone.
 */
import noop from 'lodash/noop';
import React from 'react';
import { measureRenders } from 'reassure';

import { ActivityList } from '../src';

import { makeActivitySections } from './fixtures/activity';
import { expectMounted, PerfProviders } from './testUtils';

const sections = makeActivitySections(100);

test('ActivityList — 100 rows grouped by date, initial render', async () => {
  await measureRenders(
    <ActivityList sections={sections} onActivityPress={noop} />,
    { scenario: expectMounted('activity-tx-0'), wrapper: PerfProviders },
  );
});
