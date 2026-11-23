/* eslint-disable functional/no-let -- This standalone DOM fixture retains connection and transaction state between user actions. */
import { inspectTransaction } from './inspector';

import type {
  ConnectedAPI,
  DesiredInput,
  DesiredOutput,
  InitialAPI,
} from '@midnightntwrk/dapp-connector-api';

type Epoch = 'v8' | 'v9';
type Identity = {
  networkId: string;
  shieldedAddress: string;
  unshieldedAddress: string;
};
type Offer = {
  format: 'lace-swap-test-1';
  network: string;
  epoch: Epoch;
  tx: string;
  request?: unknown;
};
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const value = (id: string) => element<HTMLInputElement>(id).value.trim();
const json = (data: unknown) =>
  JSON.stringify(
    data,
    (_key, item: unknown) =>
      typeof item === 'bigint' ? item.toString() : item,
    2,
  );
const show = (id: string, data: unknown) => {
  element(id).textContent = typeof data === 'string' ? data : json(data);
};
const events: unknown[] = [];
let api: ConnectedAPI | undefined;
let identity: Identity | undefined;
let loaded: Offer | undefined;
let balanced: { tx: string; identity: Identity; offer: string } | undefined;
let busy = false;
let providers: [string, InitialAPI][] = [];

const record = (stage: string, data: unknown) => {
  data = JSON.parse(json(data) ?? 'null', (_key, item: unknown) =>
    typeof item === 'string'
      ? item.replace(/(?:https?|wss?):\/\/[^\s"'<>]+/g, match => {
          try {
            const url = new URL(match);
            return url.origin + url.pathname;
          } catch {
            return '[URL omitted]';
          }
        })
      : item,
  );
  events.push({
    at: new Date().toISOString(),
    stage,
    caseId: value('case'),
    extensionBuild: value('build'),
    data,
  });
  show('report', events);
};
const discardBalanced = () => {
  balanced = undefined;
  show('balanced', 'No balanced transaction.');
};
const errorDetails = (error: unknown): unknown => {
  if (error instanceof Error)
    return {
      name: error.name,
      message: error.message,
      cause: error.cause ? errorDetails(error.cause) : undefined,
    };
  return error;
};
const action = (id: string, run: () => Promise<void> | void) => {
  element(id).addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    document
      .querySelectorAll<
        | HTMLButtonElement
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >('button, input, select, textarea')
      .forEach(button => {
        button.disabled = true;
      });
    show('status', `${element(id).textContent} in progress…`);
    try {
      await run();
      show(
        'status',
        `${element(id).textContent} completed. See the run record.`,
      );
    } catch (error) {
      record(`${id}:error`, errorDetails(error));
      show('status', `Failed: ${json(errorDetails(error))}`);
    } finally {
      busy = false;
      document
        .querySelectorAll<
          | HTMLButtonElement
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
        >('button, input, select, textarea')
        .forEach(button => {
          button.disabled = false;
        });
    }
  });
};
const currentIdentity = async (wallet: ConnectedAPI): Promise<Identity> => {
  const status = await wallet.getConnectionStatus();
  if (status.status !== 'connected' || status.networkId !== value('network'))
    throw new Error('Network changed or wallet disconnected. Reconnect first.');
  const [shielded, unshielded] = await Promise.all([
    wallet.getShieldedAddresses(),
    wallet.getUnshieldedAddress(),
  ]);
  return {
    networkId: status.networkId,
    shieldedAddress: shielded.shieldedAddress,
    unshieldedAddress: unshielded.unshieldedAddress,
  };
};
const checkedWallet = async () => {
  if (!api || !identity) throw new Error('Connect a wallet first.');
  const current = await currentIdentity(api);
  if (json(current) !== json(identity)) {
    discardBalanced();
    throw new Error(
      'Connected account changed. Reconnect and capture new starting balances.',
    );
  }
  return api;
};
const snapshot = async (wallet: ConnectedAPI) => {
  const account = await currentIdentity(wallet);
  const [shielded, unshielded, dust] = await Promise.all([
    wallet.getShieldedBalances(),
    wallet.getUnshieldedBalances(),
    wallet.getDustBalance(),
  ]);
  const data = { account, shielded, unshielded, dust };
  show('account', data);
  record('balance-snapshot', data);
};
const readOffer = (): Offer => {
  const candidate: unknown = JSON.parse(value('offer'));
  if (!candidate || typeof candidate !== 'object')
    throw new Error('Expected offer JSON.');
  const o = candidate as Partial<Offer>;
  if (
    o.format !== 'lace-swap-test-1' ||
    typeof o.tx !== 'string' ||
    o.network !== value('network') ||
    o.epoch !== value('epoch')
  )
    throw new Error('Offer format, network or epoch does not match this page.');
  return o as Offer;
};
const loadOffer = async () => {
  loaded = undefined;
  discardBalanced();
  const offer = readOffer();
  const inspection = await inspectTransaction(offer.tx, offer.epoch);
  loaded = offer;
  show('inspection', inspection);
  record('inspect-offer', { network: offer.network, inspection });
};
const download = (name: string, data: unknown) => {
  const url = URL.createObjectURL(
    new Blob([json(data)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const addRow = (id: 'inputs' | 'outputs') => {
  const row = document.createElement('tr');
  const fields = [
    'kind',
    'type',
    'value',
    ...(id === 'outputs' ? ['recipient'] : []),
  ];
  for (const field of fields) {
    const cell = row.insertCell();
    const input = document.createElement(field === 'kind' ? 'select' : 'input');
    input.dataset.field = field;
    input.setAttribute('aria-label', `${id} ${field}`);
    if (input instanceof HTMLSelectElement)
      for (const kind of ['shielded', 'unshielded'])
        input.add(new Option(kind, kind));
    else input.placeholder = field === 'value' ? '1' : field;
    cell.append(input);
  }
  const remove = document.createElement('button');
  remove.textContent = 'Remove';
  remove.onclick = () => {
    if (!busy) row.remove();
  };
  row.insertCell().append(remove);
  element(id).append(row);
};
const rows = (id: 'inputs' | 'outputs') =>
  [...element(id).querySelectorAll('tr')].map(row => {
    const field = (name: string) =>
      row
        .querySelector<HTMLInputElement>(`[data-field="${name}"]`)!
        .value.trim();
    const kind = field('kind') as 'shielded' | 'unshielded';
    const type = field('type');
    const amount = field('value');
    if (!/^[a-f0-9]{64}$/i.test(type))
      throw new Error('Token identifiers must be 32-byte hex strings.');
    if (!/^[1-9][0-9]*$/.test(amount))
      throw new Error('Amounts must be positive integer base units.');
    const result: DesiredInput = {
      kind,
      type: type.toLowerCase(),
      value: BigInt(amount),
    };
    if (id === 'inputs') return result;
    const recipient = field('recipient');
    if (!recipient) throw new Error('A receive address is required.');
    return { ...result, recipient };
  });
action('discover', () => {
  const midnight = (
    window as Window & { midnight?: Record<string, InitialAPI> }
  ).midnight;
  providers = Object.entries(midnight ?? {}).filter(
    ([, p]) => typeof p.connect === 'function',
  );
  const select = element<HTMLSelectElement>('provider');
  select.replaceChildren();
  for (const [id, provider] of providers)
    select.add(
      new Option(
        `${provider.name} (${provider.rdns}, ${provider.apiVersion})`,
        id,
      ),
    );
  if (!providers.length)
    throw new Error(
      'No Midnight provider found. Enable the extension and refresh wallets.',
    );
});
action('connect', async () => {
  api = undefined;
  identity = undefined;
  discardBalanced();
  const provider = providers.find(([id]) => id === value('provider'))?.[1];
  if (!provider) throw new Error('Discover and select a wallet first.');
  const connected = await provider.connect(value('network'));
  identity = await currentIdentity(connected);
  api = connected;
  record('connect', {
    provider: provider.rdns,
    apiVersion: provider.apiVersion,
    identity,
  });
  await snapshot(connected);
});
action('snapshot', async () => snapshot(await checkedWallet()));
action('add-input', () => addRow('inputs'));
action('add-output', () => addRow('outputs'));
action('create', async () => {
  loaded = undefined;
  discardBalanced();
  const wallet = await checkedWallet();
  const inputs = rows('inputs') as DesiredInput[];
  const outputs = rows('outputs') as DesiredOutput[];
  if (!inputs.length && !outputs.length)
    throw new Error('Add at least one give or receive row.');
  const rawId = value('intent');
  const intentId: number | 'random' =
    rawId === 'random' ? 'random' : Number(rawId);
  if (
    intentId !== 'random' &&
    (!/^[0-9]+$/.test(rawId) ||
      !Number.isInteger(intentId) ||
      intentId < 1 ||
      intentId > 65535)
  )
    throw new Error('Intent ID must be random or an integer from 1 to 65535.');
  const options = { intentId, payFees: value('fees') === 'true' };
  const request = { inputs, outputs, options };
  const network = value('network');
  const epoch = value('epoch') as Epoch;
  await snapshot(wallet);
  record('makeIntent:request', request);
  const result = await wallet.makeIntent(inputs, outputs, options);
  element<HTMLTextAreaElement>('offer').value = json({
    format: 'lace-swap-test-1',
    network,
    epoch,
    tx: result.tx,
    request,
  });
  await checkedWallet();
  await loadOffer();
});
action('load', loadOffer);
action('export-offer', () => download('midnight-offer.json', readOffer()));
element<HTMLInputElement>('file').addEventListener('change', async () => {
  if (busy) return;
  const file = element<HTMLInputElement>('file').files?.[0];
  if (!file) return;
  element<HTMLTextAreaElement>('offer').value = await file.text();
  loaded = undefined;
  discardBalanced();
  show('status', 'File opened. Click Load and inspect offer.');
});
element('offer').addEventListener('input', () => {
  loaded = undefined;
  discardBalanced();
});
for (const id of ['network', 'epoch', 'provider'])
  element(id).addEventListener('change', () => {
    loaded = undefined;
    discardBalanced();
  });
action('balance', async () => {
  const wallet = await checkedWallet();
  if (!loaded || json(readOffer()) !== json(loaded))
    throw new Error('Load and inspect the current offer first.');
  const offer = loaded;
  discardBalanced();
  await snapshot(wallet);
  record('balance:request', {
    payFees: value('taker-fees') === 'true',
    epoch: offer.epoch,
  });
  const result = await wallet.balanceSealedTransaction(offer.tx, {
    payFees: value('taker-fees') === 'true',
  });
  await checkedWallet();
  if (json(readOffer()) !== json(offer))
    throw new Error(
      'Offer changed while balancing. Reload it before retrying.',
    );
  const inspection = await inspectTransaction(result.tx, offer.epoch);
  balanced = { tx: result.tx, identity: identity!, offer: json(offer) };
  show('balanced', inspection);
  record('balance:result', inspection);
});
action('submit', async () => {
  const wallet = await checkedWallet();
  const candidate = balanced;
  if (
    !candidate ||
    candidate.offer !== json(readOffer()) ||
    json(candidate.identity) !== json(identity)
  )
    throw new Error(
      'Balance this offer with the current account before submitting.',
    );
  balanced = undefined;
  record(
    'submit:request',
    await inspectTransaction(candidate.tx, readOffer().epoch),
  );
  await wallet.submitTransaction(candidate.tx);
  record(
    'submit:returned',
    'Check inclusion, both wallets and Activity. This is not a settlement verdict.',
  );
});
action('export-report', () =>
  download('midnight-swap-report.json', {
    format: 'lace-swap-report-1',
    events,
  }),
);
addRow('inputs');
addRow('outputs');
