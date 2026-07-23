import { sha256 } from '@noble/hashes/sha2';
import { vi } from 'vitest';

vi.mock('@noble/hashes/argon2', () => ({
  argon2idAsync: vi.fn(async (password: Uint8Array, salt: Uint8Array) =>
    sha256(Uint8Array.from([...password, ...salt])),
  ),
}));
