import { useAnalytics } from '@lace-contract/analytics';
import debounce from 'lodash/debounce';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';

import type { ContactItem } from '@lace-lib/ui-toolkit';

const DEBOUNCE_DELAY_MS = 300;

export const useSearchContacts = (contactItems: ContactItem[]) => {
  const { trackEvent } = useAnalytics();
  const trackEventRef = useRef(trackEvent);
  trackEventRef.current = trackEvent;
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const debouncedSetSearchQueryRef = useRef(
    debounce((value: string) => {
      setDebouncedSearchQuery(value);
      if (value) trackEventRef.current('address book | search | change');
    }, DEBOUNCE_DELAY_MS),
  );

  // Debounce search query
  useEffect(() => {
    debouncedSetSearchQueryRef.current(searchQuery);
  }, [searchQuery]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearchQueryRef.current.cancel();
    };
  }, []);

  // Filter contacts by name based on debounced search query
  const filteredContacts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return contactItems;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    return contactItems.filter(contact =>
      contact.name.toLowerCase().includes(query),
    );
  }, [contactItems, debouncedSearchQuery]);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    [setSearchQuery],
  );

  return {
    debouncedSearchQuery,
    searchQuery,
    onSearchChange,
    filteredContacts,
  };
};
