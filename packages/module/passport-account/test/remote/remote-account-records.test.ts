import { RecordCorruptedError } from '@lace-contract/passport';
import { RemoteSignerError } from '@lace-lib/passkey';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MalformedPayloadError } from '../../src/remote/codec';
import { createRemoteAccountRecordStore } from '../../src/remote/remote-account-records';

import type { PassportAccountRecord } from '../../src/store/account-record';

const record: PassportAccountRecord = {
  address: 'ac'.repeat(32),
  bindingVersion: '0.1.0-lace.1',
  localUseCounter: '3',
};

const setup = (answer: unknown = undefined) => {
  const client = { request: vi.fn(async () => answer) };
  return { client, store: createRemoteAccountRecordStore(client) };
};

describe('createRemoteAccountRecordStore', () => {
  it('reads the record the signer holds', async () => {
    const { client, store } = setup(record);

    await expect(firstValueFrom(store.read())).resolves.toEqual(record);
    expect(client.request).toHaveBeenCalledExactlyOnceWith('record-read', {});
  });

  it('reads undefined when the signer holds no record', async () => {
    const { store } = setup();

    await expect(firstValueFrom(store.read())).resolves.toBeUndefined();
  });

  it('errors on a record of the wrong shape', async () => {
    const { store } = setup({ address: 7 });

    await expect(firstValueFrom(store.read())).rejects.toThrow(
      new MalformedPayloadError('record.address'),
    );
  });

  it('writes the record to the signer and emits undefined', async () => {
    const { client, store } = setup();

    await expect(firstValueFrom(store.write(record))).resolves.toBeUndefined();
    expect(client.request).toHaveBeenCalledExactlyOnceWith('record-write', {
      record,
    });
  });

  it('reports presence as the signer answers it', async () => {
    const { client, store } = setup('pending');

    await expect(firstValueFrom(store.presence())).resolves.toBe('pending');
    expect(client.request).toHaveBeenCalledExactlyOnceWith('record-exists', {});
  });

  it('errors when presence is not one of the three words', async () => {
    const { store } = setup(true);

    await expect(firstValueFrom(store.presence())).rejects.toThrow(
      new MalformedPayloadError('presence'),
    );
  });

  it('sends nothing until subscribed, once per subscription', async () => {
    const { client, store } = setup('complete');
    const presence$ = store.presence();

    expect(client.request).not.toHaveBeenCalled();
    await firstValueFrom(presence$);
    await firstValueFrom(presence$);
    expect(client.request).toHaveBeenCalledTimes(2);
  });

  it('maps a coded failure onto its Passport error', async () => {
    const store = createRemoteAccountRecordStore({
      request: vi.fn(async () => {
        throw new RemoteSignerError('record-corrupted', 'tampered');
      }),
    });

    await expect(firstValueFrom(store.read())).rejects.toBeInstanceOf(
      RecordCorruptedError,
    );
  });
});
