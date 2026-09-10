// Typed method wrappers over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). This module needs only the two
// host-owned grant-table methods (ADR 41 `lace.dapps`): list / revoke.

import { request } from '@lace-lib/extension-shell-client';

export type AuthorizedDappRef = {
  blockchain: string;
  origin: string;
};

export const listAuthorizedDapps = async () => request('dapps.list');
export const revokeAuthorizedDappGrant = async (ref: AuthorizedDappRef) =>
  request('dapps.revoke', ref);
