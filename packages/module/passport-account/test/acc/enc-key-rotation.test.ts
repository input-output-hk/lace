import { describe, expect, it } from 'vitest';

import {
  APPEND_INBOX_CIRCUIT,
  ROTATE_ENC_KEY_CIRCUIT,
} from '../../src/acc/enc-key-circuits';
import {
  prepareAppendInbox,
  prepareRotateEncKey,
} from '../../src/acc/enc-key-rotation';

describe('prepareRotateEncKey', () => {
  it('names the rotation circuit over the new raw key', () => {
    const key = new Uint8Array(32).fill(4);

    expect(prepareRotateEncKey(key)).toEqual({
      circuit: ROTATE_ENC_KEY_CIRCUIT,
      args: [key],
    });
  });
});

describe('prepareAppendInbox', () => {
  it('names the append circuit over one entry', () => {
    const entry = new Uint8Array(192).fill(5);

    expect(prepareAppendInbox(entry)).toEqual({
      circuit: APPEND_INBOX_CIRCUIT,
      args: [entry],
    });
  });
});
