import { Cardano } from '@cardano-sdk/core';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { rewardAcountMock } from '@src/wallet/test/mocks/mock';
import { mockObservableWallet } from '@src/wallet/test/mocks';
import { firstValueFrom, of } from 'rxjs';
import { buildDelegation } from '../build-delegation';

describe('Testing buildDelegation', () => {
  const poolId = Cardano.PoolId('pool185g59xpqzt7gf0ljr8v8f3akl95qnmardf2f8auwr3ffx7atjj5');
  const stakeKeyHash = Cardano.RewardAccount.toHash(rewardAcountMock.address);

  const stakeKeyCertificate: Cardano.StakeAddressCertificate = {
    __typename: Cardano.CertificateType.StakeKeyRegistration,
    stakeKeyHash
  };

  const delegationCertificate: Cardano.StakeDelegationCertificate = {
    __typename: Cardano.CertificateType.StakeDelegation,
    stakeKeyHash,
    poolId
  };

  test('should return both the stake key and delegation certificates when delegating for the first time', async () => {
    const wallet = {
      ...mockObservableWallet,
      delegation: {
        rewardAccounts$: of([{ ...rewardAcountMock, keyStatus: Cardano.StakeKeyStatus.Unregistered }])
      }
    } as unknown as ObservableWallet;
    const { certificates } = await buildDelegation(wallet, poolId);

    expect(certificates).toContainEqual(stakeKeyCertificate);
    expect(certificates).toContainEqual(delegationCertificate);
  });

  test('should return the delegation certificate only if stake key already registered', async () => {
    const wallet = {
      ...mockObservableWallet,
      delegation: { rewardAccounts$: of([rewardAcountMock]) }
    } as unknown as ObservableWallet;
    const walletRewardAccount = (await firstValueFrom(wallet.delegation.rewardAccounts$))[0];
    walletRewardAccount.keyStatus = Cardano.StakeKeyStatus.Registered;
    const { certificates } = await buildDelegation(wallet, poolId);

    expect(certificates).toContainEqual(delegationCertificate);
    expect(certificates).not.toContainEqual(stakeKeyCertificate);
  });
});
