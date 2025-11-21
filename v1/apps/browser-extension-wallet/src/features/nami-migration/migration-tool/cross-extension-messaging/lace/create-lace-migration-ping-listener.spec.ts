import { createLaceMigrationPingListener } from './create-lace-migration-ping-listener';
import { NamiLacePingProtocol } from '../shared/types';

describe('create lace migration ping listener', () => {
  const namiId = 'fakeNamiId';

  it('should answer ping messages from Nami', async () => {
    const listener = createLaceMigrationPingListener(namiId);
    const response = await listener(NamiLacePingProtocol.ping, { id: namiId });
    expect(response).toBe(NamiLacePingProtocol.pong);
  });

  it('should ignore messages not coming from Nami extension', async () => {
    const listener = createLaceMigrationPingListener(namiId);
    const response = await listener(NamiLacePingProtocol.ping, {
      id: 'otherId'
    });
    expect(response).toBeUndefined();
  });

  it('should ignore other messages coming from Nami', async () => {
    const listener = createLaceMigrationPingListener(namiId);
    const response = await listener('other' as NamiLacePingProtocol, {
      id: namiId
    });
    expect(response).toBeUndefined();
  });
});
