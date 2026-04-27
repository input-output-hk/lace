import { Cardano } from '@cardano-sdk/core';
import {
  getStateFromPath,
  NavigationControls,
  SheetRoutes,
  StackRoutes,
  type LinkingOptions,
  type ParamListBase,
} from '@lace-lib/navigation';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { linking } from '../src/linking';

vi.mock('@lace-lib/navigation', async () => {
  return {
    // Keep this mock minimal + deterministic for unit tests.
    // We only need the parts consumed by `src/linking.ts` and assertions below.
    getStateFromPath: vi.fn(),
    NavigationControls: { sheets: { navigate: vi.fn() } },
    SheetRoutes: { Send: 'Send' },
    StackRoutes: { ClaimPayload: 'ClaimPayload', Home: 'Home' },
  };
});

describe('linking configuration', () => {
  let linkingConfig: LinkingOptions<ParamListBase>;

  beforeEach(async () => {
    vi.clearAllMocks();
    linkingConfig = await linking({} as never, {} as never);
  });

  describe('prefixes', () => {
    it('should export cardano:// prefix', () => {
      expect(linkingConfig.prefixes).toContain('cardano://');
    });

    it('should export web+cardano:// prefix', () => {
      expect(linkingConfig.prefixes).toContain('web+cardano://');
    });

    it('should have exactly two prefixes', () => {
      expect(linkingConfig.prefixes).toHaveLength(2);
    });
  });

  describe('screen config', () => {
    it('should configure ClaimPayload screen with claim/v1 path', () => {
      const screens = linkingConfig.config?.screens;
      expect(screens).toBeDefined();
      expect(screens?.[StackRoutes.ClaimPayload]).toBeDefined();
      expect(screens?.[StackRoutes.ClaimPayload]).toEqual({
        path: 'claim/v1',
        parse: {
          faucet_url: String,
        },
      });
    });

    it('should set Home as initialRouteName', () => {
      expect(linkingConfig.config?.initialRouteName).toBe(StackRoutes.Home);
    });
  });

  describe('getStateFromPath', () => {
    it('should return parsed state for configured routes', () => {
      const mockState = {
        routes: [{ name: StackRoutes.ClaimPayload, params: {} }],
      };
      vi.mocked(getStateFromPath).mockReturnValue(mockState);

      const options = linkingConfig.config as Parameters<
        typeof getStateFromPath
      >[1];
      const path = 'claim/v1?faucet_url=https://example.com&code=abc123';
      const result = linkingConfig.getStateFromPath?.(path, options);

      expect(getStateFromPath).toHaveBeenCalledWith(path, options);
      expect(result).toEqual(mockState);
    });

    it('should trigger navigation for valid Cardano addresses when path does not match configured routes', () => {
      vi.mocked(getStateFromPath).mockReturnValue(undefined);

      // Use a valid Cardano mainnet address format
      const validAddress =
        'addr1qxck8cqdmjj5nnp24zala096pdxlhg8nyg3t4yx0cul9m3shulhfmcp8fceq2ye6dahf7xef66eqmr5scnk67qnvxfqqvp3j0h';
      vi.spyOn(Cardano.Address, 'isValid').mockReturnValue(true);

      const options = linkingConfig.config as Parameters<
        typeof getStateFromPath
      >[1];
      const result = linkingConfig.getStateFromPath?.(validAddress, options);

      expect(NavigationControls.sheets.navigate).toHaveBeenCalledWith(
        SheetRoutes.Send,
        { recipientAddress: validAddress },
      );
      expect(result).toBeUndefined();
    });

    it('should not trigger navigation for invalid Cardano addresses', () => {
      vi.mocked(getStateFromPath).mockReturnValue(undefined);
      vi.spyOn(Cardano.Address, 'isValid').mockReturnValue(false);

      const invalidAddress = 'invalid-address';
      const options = linkingConfig.config as Parameters<
        typeof getStateFromPath
      >[1];
      const result = linkingConfig.getStateFromPath?.(invalidAddress, options);

      expect(NavigationControls.sheets.navigate).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle paths with query parameters when checking for valid address', () => {
      vi.mocked(getStateFromPath).mockReturnValue(undefined);
      vi.spyOn(Cardano.Address, 'isValid').mockReturnValue(true);

      const addressWithParams =
        'addr1qxck8cqdmjj5nnp24zala096pdxlhg8nyg3t4yx0cul9m3shulhfmcp8fceq2ye6dahf7xef66eqmr5scnk67qnvxfqqvp3j0h?amount=100';

      const options = linkingConfig.config as Parameters<
        typeof getStateFromPath
      >[1];
      linkingConfig.getStateFromPath?.(addressWithParams, options);

      // Should extract address without query params
      expect(Cardano.Address.isValid).toHaveBeenCalledWith(
        'addr1qxck8cqdmjj5nnp24zala096pdxlhg8nyg3t4yx0cul9m3shulhfmcp8fceq2ye6dahf7xef66eqmr5scnk67qnvxfqqvp3j0h',
      );
    });

    it('should handle errors gracefully and return undefined', () => {
      vi.mocked(getStateFromPath).mockReturnValue(undefined);
      vi.spyOn(Cardano.Address, 'isValid').mockImplementation(() => {
        throw new Error('Validation error');
      });

      const path = 'malformed-path';
      const options = linkingConfig.config as Parameters<
        typeof getStateFromPath
      >[1];
      const result = linkingConfig.getStateFromPath?.(path, options);

      expect(result).toBeUndefined();
      expect(NavigationControls.sheets.navigate).not.toHaveBeenCalled();
    });
  });
});
