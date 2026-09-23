import { describe, expect, it } from 'vitest';

import { shouldRenderEmbeddedGate } from '../src/embedded-gate';

describe('shouldRenderEmbeddedGate', () => {
  it('lets a framed guest boot — the shipping deployment', () => {
    expect(
      shouldRenderEmbeddedGate({ allowStandalone: false, isEmbedded: true }),
    ).toBe(false);
  });

  it('gates a direct top-level visit to a shipped build', () => {
    expect(
      shouldRenderEmbeddedGate({ allowStandalone: false, isEmbedded: false }),
    ).toBe(true);
  });

  it('lets a standalone-allowed build boot unembedded — the e2e harness and dev server', () => {
    expect(
      shouldRenderEmbeddedGate({ allowStandalone: true, isEmbedded: false }),
    ).toBe(false);
  });

  it('never gates a framed guest, standalone-allowed or not', () => {
    expect(
      shouldRenderEmbeddedGate({ allowStandalone: true, isEmbedded: true }),
    ).toBe(false);
  });
});
