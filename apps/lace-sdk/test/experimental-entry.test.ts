import { describe, expect, it } from 'vitest';

import * as cardano from '../src/cardano';
import * as cardanoCanary from '../src/cardano.canary';
import * as experimental from '../src/experimental.canary';
import * as rootCanary from '../src/index.canary';

describe('the experimental entry', () => {
  it.each([
    'AccountCreationPendingError',
    'AuthorityNotRetiredError',
    'AuthorityRetiredError',
    'CreationArtefactMismatchError',
    'CreationLockMismatchError',
    'GrantIssueRejectedError',
    'GrantLimitReachedError',
    'GrantNotFoundError',
    'GrantOpeningUnavailableError',
    'GrantOriginMissingError',
    'GrantRevokedError',
    'GrantRosterUnsettledError',
    'GrantScopeInvalidError',
    'GrantSpendRefusedError',
    'MaintenanceAuthorityMismatchError',
    'MaintenanceUpdateRefusedError',
    'MAX_GRANTS',
    'OperationNotInstallableError',
    'PASSPORT_AGENT_POLICY_VERSION',
    'PassportAgentPolicyInvalidError',
    'TokenColor',
    'TokenColorError',
    'exportPassportAgentPolicy',
    'grantSpendAuthorisationArgs',
    'loadPassportGrantSpendChallenges',
    'parsePassportAgentPolicy',
    'preparePassportGrantSpend',
    'validateGrantScope',
  ])('exports %s', name => {
    expect(experimental).toHaveProperty(name);
  });

  it.each(['GrantId', 'GrantScopeSalt', 'GrantSlot'])(
    'leaves out the %s constructor, whose values come from state',
    name => {
      expect(experimental).not.toHaveProperty(name);
    },
  );

  it.each([
    'createCardanoCustodyAccount',
    'createCardanoCustodySponsorClient',
    'exportCardanoCustodyAgentPolicy',
    'verifyCardanoCustodyDataSignature',
    'createRemotePassportSeams',
    'deriveSymmetricSecret',
  ])('exports %s', name => {
    expect(experimental).toHaveProperty(name);
  });

  it('carries the Cardano entry, so a wallet needs no other entry', () => {
    const { m: _cardanoModules, ...cardanoExports } = cardano;
    for (const name of Object.keys(cardanoExports)) {
      expect(experimental).toHaveProperty(name);
    }
    expect(Object.keys(experimental.m)).toEqual(
      expect.arrayContaining([
        ...Object.keys(cardano.m),
        'createPassportAccountModule',
      ]),
    );
  });

  it('holds the only export of each experimental feature', () => {
    const { m: experimentalModules, ...experimentalExports } = experimental;
    const experimentalOnly = Object.keys(experimentalExports).filter(
      name => !(name in cardano),
    );
    expect(experimentalOnly.length).toBeGreaterThan(0);
    for (const entry of [rootCanary, cardanoCanary]) {
      for (const name of experimentalOnly) {
        expect(entry).not.toHaveProperty(name);
      }
      for (const name of Object.keys(experimentalModules)) {
        if (!(name in cardano.m)) expect(entry.m).not.toHaveProperty(name);
      }
    }
  });
});
