import { describe, expect, it } from 'vitest';

import { CIP30_API_METHODS } from '../src/browser/const';
import {
  CIP30_EXTENSIONS,
  CIP30_EXTENSION_METHODS,
  supportedCip30Extensions,
} from '../src/common/cip30-extensions';

describe('CIP-30 extension registry', () => {
  it('advertises the registered extensions (CIP-95 and CIP-142)', () => {
    expect(supportedCip30Extensions()).toEqual([{ cip: 95 }, { cip: 142 }]);
  });

  it('returns a fresh array so callers cannot mutate the registry', () => {
    const first = supportedCip30Extensions();
    first.push({ cip: 999 });
    expect(supportedCip30Extensions()).toEqual([{ cip: 95 }, { cip: 142 }]);
  });

  it('declares at least one method for every registered extension', () => {
    for (const extension of CIP30_EXTENSIONS) {
      expect(extension.methods.length).toBeGreaterThan(0);
    }
  });

  it('routes every registered extension method through CIP30_API_METHODS', () => {
    // Registration guarantee: an extension added to the registry must have all
    // of its namespace methods exposed by the page-side proxy and the SW-side
    // exposeApi, both of which build from CIP30_API_METHODS. If this fails, an
    // extension is advertised but (some of) its methods are unreachable.
    const routed = CIP30_API_METHODS as readonly string[];
    const unrouted = CIP30_EXTENSION_METHODS.filter(
      method => !routed.includes(method),
    );
    expect(unrouted).toEqual([]);
  });
});
