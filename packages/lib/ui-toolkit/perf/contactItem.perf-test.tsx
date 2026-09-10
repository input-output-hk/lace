/**
 * Contact (address book row) render cost at production fidelity: the row the
 * Send address book renders per contact on every platform. 30 rows with a
 * multi-address contact every 5th, matching a well-used address book.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
import { measureRenders } from 'reassure';

import { Contact } from '../src';

import { makeContactProps } from './fixtures/contacts';
import { expectMounted, PerfProviders } from './testUtils';

const ROWS = 30;
const contacts = makeContactProps(ROWS);

test('Contact × 30 — address book list, initial render', async () => {
  await measureRenders(
    <View>
      {contacts.map(contact => (
        <Contact key={contact.testID} {...contact} />
      ))}
    </View>,
    { scenario: expectMounted('perf-contact-0'), wrapper: PerfProviders },
  );
});

/**
 * Expanding a multi-address contact mounts its address sub-list; collapsing
 * unmounts it. The state is local to that row, so this guards accordion
 * isolation: only the pressed row should commit — a regression that lifts the
 * state or re-renders siblings shows up as extra duration against a 30-row
 * backdrop. Contact #0 is multi-address by fixture construction.
 */
test('Contact × 30 — expand + collapse one multi-address row (×2)', async () => {
  const scenario = async () => {
    fireEvent.press(screen.getByTestId('perf-contact-0'));
    fireEvent.press(screen.getByTestId('perf-contact-0'));
  };
  await measureRenders(
    <View>
      {contacts.map(contact => (
        <Contact key={contact.testID} {...contact} />
      ))}
    </View>,
    { scenario, wrapper: PerfProviders },
  );
});
