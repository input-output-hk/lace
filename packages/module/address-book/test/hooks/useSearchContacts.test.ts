import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lace-contract/analytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

import { useSearchContacts } from '../../src/hooks/useSearchContacts';

import type { ContactItem } from '@lace-lib/ui-toolkit';

const mockContactItems: ContactItem[] = [
  {
    name: 'Alice Smith',
    addresses: [
      {
        name: 'Main',
        address: 'addr1...',
        blockchainName: 'Cardano',
        accountId: 'account1',
      },
    ],
  },
  {
    name: 'Bob Johnson',
    addresses: [
      {
        name: 'Main',
        address: 'addr2...',
        blockchainName: 'Cardano',
        accountId: 'account2',
      },
    ],
  },
  {
    name: 'Charlie Brown',
    addresses: [
      {
        name: 'Main',
        address: 'addr3...',
        blockchainName: 'Cardano',
        accountId: 'account3',
      },
    ],
  },
] as ContactItem[];

describe('useSearchContacts', () => {
  describe('Initialization', () => {
    it('should initialize with empty search query and all contacts', () => {
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredContacts).toHaveLength(3);
      expect(result.current.filteredContacts[0].name).toBe('Alice Smith');
      expect(result.current.filteredContacts[1].name).toBe('Bob Johnson');
      expect(result.current.filteredContacts[2].name).toBe('Charlie Brown');
    });
  });

  describe('Search filtering', () => {
    it('should filter contacts by name (case-insensitive)', async () => {
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('alice');
      });

      // Wait for debounce
      await waitFor(
        () => {
          expect(result.current.searchQuery).toBe('alice');
          expect(result.current.filteredContacts).toHaveLength(1);
          expect(result.current.filteredContacts[0].name).toBe('Alice Smith');
        },
        { timeout: 400 },
      );
    });

    it('should filter contacts by partial name match', async () => {
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('Char');
      });

      await waitFor(
        () => {
          expect(result.current.filteredContacts).toHaveLength(1);
          expect(result.current.filteredContacts[0].name).toBe('Charlie Brown');
        },
        { timeout: 400 },
      );
    });

    it('should return empty array when no contacts match', async () => {
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('NonExistent');
      });

      await waitFor(
        () => {
          expect(result.current.filteredContacts).toHaveLength(0);
        },
        { timeout: 400 },
      );
    });

    it('should trim whitespace from search query', async () => {
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('  alice  ');
      });

      await waitFor(
        () => {
          expect(result.current.filteredContacts).toHaveLength(1);
          expect(result.current.filteredContacts[0].name).toBe('Alice Smith');
        },
        { timeout: 400 },
      );
    });

    it('should return all contacts when search query is empty or only whitespace', async () => {
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('   ');
      });

      await waitFor(
        () => {
          expect(result.current.filteredContacts).toHaveLength(3);
        },
        { timeout: 400 },
      );
    });
  });

  describe('Debouncing', () => {
    it('should debounce search query updates', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('A');
      });

      // Before debounce delay
      expect(result.current.filteredContacts).toHaveLength(3);

      act(() => {
        result.current.onSearchChange('Al');
      });

      // Still before debounce delay
      expect(result.current.filteredContacts).toHaveLength(3);

      act(() => {
        result.current.onSearchChange('Alice');
      });

      // Advance timers by debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // After debounce delay
      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Alice Smith');

      vi.useRealTimers();
    });

    it('should handle multiple rapid search changes and only apply the last one', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useSearchContacts(mockContactItems));

      act(() => {
        result.current.onSearchChange('A');
      });
      act(() => {
        result.current.onSearchChange('Al');
      });
      act(() => {
        result.current.onSearchChange('Ali');
      });
      act(() => {
        result.current.onSearchChange('Alice');
      });

      // Advance timers by debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only filter once with the last value
      expect(result.current.filteredContacts).toHaveLength(1);
      expect(result.current.filteredContacts[0].name).toBe('Alice Smith');

      vi.useRealTimers();
    });
  });

  describe('Contact items updates', () => {
    it('should update filtered contacts when contactItems change', () => {
      const { result, rerender } = renderHook(
        ({ contactItems }) => useSearchContacts(contactItems),
        {
          initialProps: { contactItems: mockContactItems },
        },
      );

      expect(result.current.filteredContacts).toHaveLength(3);

      const newContactItems: ContactItem[] = [
        ...mockContactItems,
        {
          name: 'David Wilson',
          addresses: [
            {
              name: 'Main',
              address: 'addr4...',
              blockchainName: 'Cardano',
              accountId: 'account4',
            },
          ],
        },
      ] as ContactItem[];

      rerender({ contactItems: newContactItems });

      expect(result.current.filteredContacts).toHaveLength(4);
    });

    it('should maintain search filter when contactItems change', async () => {
      const { result, rerender } = renderHook(
        ({ contactItems }) => useSearchContacts(contactItems),
        {
          initialProps: { contactItems: mockContactItems },
        },
      );

      act(() => {
        result.current.onSearchChange('Alice');
      });

      await waitFor(
        () => {
          expect(result.current.filteredContacts).toHaveLength(1);
        },
        { timeout: 400 },
      );

      const newContactItems: ContactItem[] = [
        ...mockContactItems,
        {
          name: 'Alice Cooper',
          addresses: [
            {
              name: 'Main',
              address: 'addr5...',
              blockchainName: 'Cardano',
              accountId: 'account5',
            },
          ],
        },
      ] as ContactItem[];

      rerender({ contactItems: newContactItems });

      await waitFor(
        () => {
          expect(result.current.filteredContacts).toHaveLength(2);
          expect(result.current.filteredContacts[0].name).toBe('Alice Smith');
          expect(result.current.filteredContacts[1].name).toBe('Alice Cooper');
        },
        { timeout: 400 },
      );
    });
  });
});
