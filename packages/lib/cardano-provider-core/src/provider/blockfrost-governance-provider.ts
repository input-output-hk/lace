import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { Err, Ok } from '@lace-lib/util';
import { EMPTY, catchError, expand, from, map, of, reduce } from 'rxjs';

import { BlockfrostProvider } from '../blockfrost-provider';

import type { ProviderError as CoreProviderError } from '@cardano-sdk/core';
import type {
  DRepMetadata,
  DRepReference,
  DRepSummary,
} from '@lace-contract/cardano-context';
import type { Result } from '@lace-lib/util';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

const PAGE_SIZE = 100;

// CIP-0119 DRep metadata uses JSONLD: givenName may be a plain string or { "@value": "..." }
type JsonLdValue = { '@value': string; '@language'?: string };

type BlockfrostDRepListItem = {
  drep_id: string;
  hex: string;
  amount: string;
  has_script: boolean;
  retired: boolean;
  expired: boolean;
  last_active_epoch: number | null;
  metadata: {
    url: string;
    hash: string;
    json_metadata: unknown;
    bytes: string | null;
    error?: { code: string; message: string };
  } | null;
};

const jsonLdString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '@value' in value) {
    const inner = (value as JsonLdValue)['@value'];
    return typeof inner === 'string' ? inner : undefined;
  }
  return undefined;
};

const getMetadataBody = (
  jsonMetadata: unknown,
): Record<string, unknown> | undefined => {
  if (typeof jsonMetadata !== 'object' || jsonMetadata === null)
    return undefined;
  const body = (jsonMetadata as { body?: unknown }).body;
  if (typeof body !== 'object' || body === null) return undefined;
  return body as Record<string, unknown>;
};

const extractReferences = (
  references: unknown,
): DRepReference[] | undefined => {
  if (!Array.isArray(references)) return undefined;
  const parsed = references.flatMap((reference): DRepReference[] => {
    if (typeof reference !== 'object' || reference === null) return [];
    const { uri, label } = reference as { uri?: unknown; label?: unknown };
    const uriValue = jsonLdString(uri);
    if (uriValue === undefined) return [];
    const labelValue = jsonLdString(label);
    return [
      { uri: uriValue, ...(labelValue !== undefined && { label: labelValue }) },
    ];
  });
  return parsed.length > 0 ? parsed : undefined;
};

const extractMetadata = (
  envelope: BlockfrostDRepListItem['metadata'],
  body: Record<string, unknown> | undefined,
): DRepMetadata | undefined => {
  const metadata: DRepMetadata = {};
  // The anchor url/hash live on the Blockfrost envelope, not the CIP-119
  // body, so they survive even when the document itself is malformed.
  if (typeof envelope?.url === 'string') metadata.metadataUrl = envelope.url;
  if (typeof envelope?.hash === 'string') metadata.metadataHash = envelope.hash;
  const assign = (
    key: keyof Omit<DRepMetadata, 'references'>,
    value: unknown,
  ) => {
    const parsed = jsonLdString(value);
    if (parsed !== undefined) metadata[key] = parsed;
  };
  if (body) {
    const image =
      typeof body.image === 'object' && body.image !== null
        ? (body.image as { contentUrl?: unknown })
        : undefined;
    assign('imageUrl', image?.contentUrl);
    assign('bio', body.bio);
    assign('email', body.email);
    assign('objectives', body.objectives);
    assign('motivations', body.motivations);
    assign('qualifications', body.qualifications);
    assign('paymentAddress', body.paymentAddress);
    const references = extractReferences(body.references);
    if (references) metadata.references = references;
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const toDRepSummary = (item: BlockfrostDRepListItem): DRepSummary => {
  // Blockfrost hex is CIP-129 encoded: 1 header byte + 28-byte hash (58 hex
  // chars). Strip the header byte to get the raw hash for the CIP-105 ID.
  // Fall back to the raw value if a bare 28-byte hash is ever returned.
  const rawHash = item.hex.length === 58 ? item.hex.slice(2) : item.hex;
  const credential = {
    hash: Hash28ByteBase16(rawHash),
    type: item.has_script
      ? Cardano.CredentialType.ScriptHash
      : Cardano.CredentialType.KeyHash,
  };
  const body = getMetadataBody(item.metadata?.json_metadata);
  return {
    drepId: Cardano.DRepID(item.drep_id),
    cip105DrepId: Cardano.DRepID.cip105FromCredential(credential),
    hex: item.hex,
    isActive: !item.retired && !item.expired,
    retired: item.retired,
    expired: item.expired,
    amount: item.amount,
    hasScript: item.has_script,
    name: jsonLdString(body?.givenName),
    metadata: extractMetadata(item.metadata, body),
  };
};

export class BlockfrostGovernanceProvider extends BlockfrostProvider {
  public constructor(client: HttpClient, logger: Logger) {
    super(client, logger);
  }

  public getDReps(): Observable<Result<DRepSummary[], CoreProviderError>> {
    const fetchPage = (page: number) =>
      from(
        this.request<BlockfrostDRepListItem[]>(
          `governance/dreps?page=${page}&count=${PAGE_SIZE}`,
        ),
      );

    return fetchPage(1).pipe(
      // A full page may be the last one; the loop only stops on a short page,
      // so an exact-multiple total costs one extra (empty) request.
      expand((items, index) =>
        items.length === PAGE_SIZE ? fetchPage(index + 2) : EMPTY,
      ),
      reduce<BlockfrostDRepListItem[], BlockfrostDRepListItem[]>(
        (accumulated, items) => [...accumulated, ...items],
        [],
      ),
      map(all =>
        Ok(
          all
            .filter(d => d.drep_id.startsWith('drep1'))
            .map(item => toDRepSummary(item)),
        ),
      ),
      catchError(error => of(Err(error as CoreProviderError))),
    );
  }
}
