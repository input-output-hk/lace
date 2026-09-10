// Interpretation of the monolith's GUEST-owned slices (ADR 38). Everything here
// is UNTRUSTED legacy input: another build wrote it, possibly several major
// versions ago, and the host passes it through without judging it — so every
// field is read defensively and an entry that cannot be read is DROPPED rather
// than typed in.
//
// These records are dispatched into an ALREADY-REHYDRATED store, so no
// redux-persist migration will ever run over them. Whatever a slice's own
// `migrate` would have supplied has to be supplied here instead — hence the
// duplicated addressBook migration-2 defaults below (the same
// duplicate-over-couple posture the host's relocation takes with the monolith's
// wallets migrations).

import { ContactId } from '@lace-contract/address-book';
import { AddressAlias, AddressAliasType } from '@lace-contract/addresses';
import { BlockchainNetworkId } from '@lace-contract/network';
import { FolderId, TokenId } from '@lace-contract/tokens';
import { Timestamp, Uri } from '@lace-lib/util';

import type { Contact, ContactAddress } from '@lace-contract/address-book';
import type { Address, AddressAliasResolution } from '@lace-contract/addresses';
import type { Folder } from '@lace-contract/tokens';
import type { BlockchainName } from '@lace-lib/util-store';

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const BLOCKCHAIN_NAMES: readonly BlockchainName[] = [
  'Bitcoin',
  'Cardano',
  'Midnight',
];
const isBlockchainName = (value: string): value is BlockchainName =>
  (BLOCKCHAIN_NAMES as readonly string[]).includes(value);

/**
 * The monolith addressBook migration-2 network default, MIRRORED verbatim —
 * including its Cardano-or-Bitcoin shape (the migration predates Midnight
 * contacts and maps everything non-Cardano onto testnet4). Applies only when the
 * legacy address carries no `network` at all, i.e. a profile whose last monolith
 * run predated that migration.
 */
const legacyDefaultNetwork = (blockchainName: BlockchainName) =>
  BlockchainNetworkId(
    blockchainName === 'Cardano' ? 'cardano-1' : 'bitcoin-testnet4',
  );

const contactAddressFromWire = (value: unknown): ContactAddress | undefined => {
  const entry = asRecord(value);
  const address = asText(entry?.address);
  const blockchainName = asText(entry?.blockchainName);
  if (address === undefined || blockchainName === undefined) return undefined;
  if (!isBlockchainName(blockchainName)) return undefined;
  const network = asText(entry?.network);
  const accountId = asText(entry?.accountId);
  return {
    address: address as Address,
    blockchainName,
    // A recorded network id rides through UNTOUCHED, whatever it names. Older
    // builds wrote ids this build cannot resolve (`cardano-0`); rewriting one
    // would silently re-home a contact onto a network it was never saved for,
    // so an unresolvable id stays as saved and simply filters out of the
    // networks it does not name.
    network:
      network === undefined
        ? legacyDefaultNetwork(blockchainName)
        : BlockchainNetworkId(network),
    ...(accountId !== undefined
      ? { accountId: accountId as ContactAddress['accountId'] }
      : {}),
  };
};

/** One alias RESOLUTION (an ada-handle cache entry). All six required fields
 * must read, or the entry is dropped — a half-read resolution would render a
 * handle the address no longer resolves to. */
const aliasFromWire = (value: unknown): AddressAliasResolution | undefined => {
  const entry = asRecord(value);
  const alias = asText(entry?.alias);
  const aliasType = asText(entry?.aliasType);
  const resolvedAddress = asText(entry?.resolvedAddress);
  const resolvedAt = asNumber(entry?.resolvedAt);
  const blockchainName = asText(entry?.blockchainName);
  const networkId = asText(entry?.networkId);
  const image = asText(entry?.image);
  if (
    alias === undefined ||
    aliasType === undefined ||
    resolvedAddress === undefined ||
    resolvedAt === undefined ||
    blockchainName === undefined ||
    !isBlockchainName(blockchainName) ||
    networkId === undefined
  ) {
    return undefined;
  }
  return {
    alias: AddressAlias(alias),
    aliasType: AddressAliasType(aliasType),
    resolvedAddress: resolvedAddress as Address,
    resolvedAt: Timestamp(resolvedAt),
    blockchainName,
    networkId: BlockchainNetworkId(networkId),
    ...(image !== undefined ? { image: Uri(image) } : {}),
  };
};

/**
 * The importable contacts of a legacy `addressBook` slice state
 * (`{ contacts: Record<ContactId, Contact> }`). A contact needs a name and at
 * least one readable address to be worth importing — one with neither renders as
 * a blank, un-openable row.
 */
export const contactsFromWire = (
  addressBook: Record<string, unknown> | null,
): Contact[] => {
  const contacts = asRecord(asRecord(addressBook)?.contacts);
  if (!contacts) return [];
  const imported: Contact[] = [];
  for (const [key, value] of Object.entries(contacts)) {
    const entry = asRecord(value);
    const name = asText(entry?.name);
    if (name === undefined) continue;
    const addresses = asArray(entry?.addresses)
      .map(contactAddressFromWire)
      .filter((address): address is ContactAddress => address !== undefined);
    if (addresses.length === 0) continue;
    const avatar = asText(entry?.avatar);
    imported.push({
      // The map key IS the contact id in the monolith's shape, so it stands in
      // for an entry that lost its own `id` field.
      id: ContactId(asText(entry?.id) ?? key),
      name,
      // migration-2 default: an older profile carries no aliases array at all.
      aliases: asArray(entry?.aliases)
        .map(aliasFromWire)
        .filter(
          (alias): alias is AddressAliasResolution => alias !== undefined,
        ),
      addresses,
      ...(avatar !== undefined ? { avatar } : {}),
    });
  }
  return imported;
};

export type ImportedTokenFolders = {
  folders: Folder[];
  /** Token ids per folder, restricted to the folders above — an assignment
   * naming an unknown folder would be unreachable state. */
  tokenIdsByFolderId: Partial<Record<FolderId, TokenId[]>>;
};

/**
 * The importable NFT folders of a legacy `tokenFolders` slice state
 * (`{ folders: Folder[], tokenIdsByFolderId }`). `folders` keeps its legacy
 * order — newest first, as the slice's own `unshift` maintains it.
 */
export const tokenFoldersFromWire = (
  tokenFolders: Record<string, unknown> | null,
): ImportedTokenFolders => {
  const slice = asRecord(tokenFolders);
  const folders: Folder[] = [];
  for (const value of asArray(slice?.folders)) {
    const entry = asRecord(value);
    const id = asText(entry?.id);
    const name = asText(entry?.name);
    const accountId = asText(entry?.accountId);
    if (id === undefined || name === undefined || accountId === undefined) {
      continue;
    }
    folders.push({ id: FolderId(id), name, accountId });
  }
  const known = new Set<string>(folders.map(folder => folder.id));
  const tokenIdsByFolderId: Partial<Record<FolderId, TokenId[]>> = {};
  // migration-2 default: an older profile has no `tokenIdsByFolderId` at all.
  for (const [folderId, value] of Object.entries(
    asRecord(slice?.tokenIdsByFolderId) ?? {},
  )) {
    if (!known.has(folderId)) continue;
    const tokenIds = asArray(value)
      .map(asText)
      .filter((id): id is string => id !== undefined)
      .map(TokenId);
    if (tokenIds.length > 0) tokenIdsByFolderId[FolderId(folderId)] = tokenIds;
  }
  return { folders, tokenIdsByFolderId };
};

/**
 * The recorded analytics user id of a legacy `analytics` slice state
 * (`{ analytics: { user?: { id } } }`), or undefined when the profile holds
 * none. Undefined is the CONSENT signal, not just missing data: a monolith
 * profile with no recorded user was never opted in, so nothing is imported and
 * the guest's own consent flow decides — minting an id here would opt the user in
 * on their behalf.
 */
export const analyticsUserIdFromWire = (
  analytics: Record<string, unknown> | null,
): string | undefined =>
  asText(asRecord(asRecord(asRecord(analytics)?.analytics)?.user)?.id);
