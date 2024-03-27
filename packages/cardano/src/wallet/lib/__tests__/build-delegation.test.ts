import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { ObservableWallet } from '@cardano-sdk/wallet';
import { rewardAcountMock } from '@src/wallet/test/mocks/mock';
import { mockObservableWallet } from '@src/wallet/test/mocks';
import { firstValueFrom, of } from 'rxjs';
import { buildDelegation } from '../build-delegation';
const {
  RewardAccount,
  CredentialType: { KeyHash },
  CertificateType,
  StakeCredentialStatus
} = Cardano;
describe('Testing buildDelegation', () => {
  const poolId = Cardano.PoolId('pool185g59xpqzt7gf0ljr8v8f3akl95qnmardf2f8auwr3ffx7atjj5');
  const stakeKeyHash = RewardAccount.toHash(rewardAcountMock.address);
  const stakeCredential = {
    type: KeyHash,
    hash: Hash28ByteBase16.fromEd25519KeyHashHex(stakeKeyHash)
  };
  const stakeKeyCertificate: Cardano.StakeAddressCertificate = {
    __typename: CertificateType.StakeRegistration,
    stakeCredential
  };

  const delegationCertificate: Cardano.StakeDelegationCertificate = {
    __typename: CertificateType.StakeDelegation,
    stakeCredential,
    poolId
  };

  test('should return both the stake key and delegation certificates when delegating for the first time', async () => {
    const wallet = {
      ...mockObservableWallet,
      delegation: {
        rewardAccounts$: of([{ ...rewardAcountMock, credentialStatus: StakeCredentialStatus.Unregistered }])
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
    walletRewardAccount.credentialStatus = StakeCredentialStatus.Registered;
    const { certificates } = await buildDelegation(wallet, poolId);

    expect(certificates).toContainEqual(delegationCertificate);
    expect(certificates).not.toContainEqual(stakeKeyCertificate);
  });
});
