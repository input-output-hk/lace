import LedgerConnection from '@cardano-foundation/ledgerjs-hw-app-cardano';
import { describe, expect, it } from 'vitest';

type LedgerTransport = ConstructorParameters<typeof LedgerConnection>[0];

const SW_OK = [0x90, 0x00];

// Answers every APDU with the Cardano app's getVersion payload:
// major, minor, patch, flags, then the success status word.
const transportReportingVersion = (
  major: number,
  minor: number,
  patch: number,
): LedgerTransport =>
  ({
    decorateAppAPIMethods: () => undefined,
    send: async () => Buffer.from([major, minor, patch, 0, ...SW_OK]),
  } as unknown as LedgerTransport);

describe('Ledger Cardano app version compatibility', () => {
  it.each([
    { label: '8.0.8', major: 8, minor: 0, patch: 8 },
    { label: '7.3.1', major: 7, minor: 3, patch: 1 },
  ])('accepts Cardano app $label', async ({ major, minor, patch }) => {
    const connection = new LedgerConnection(
      transportReportingVersion(major, minor, patch),
    );

    const { version, compatibility } = await connection.getVersion();

    expect(version).toMatchObject({ major, minor, patch });
    expect(compatibility.isCompatible).toBe(true);
  });
});
