import { Cardano } from '@cardano-sdk/core';

const poolIdCertificateTypes = new Set<Cardano.CertificateType>([
  Cardano.CertificateType.StakeDelegation,
  Cardano.CertificateType.StakeRegistrationDelegation,
  Cardano.CertificateType.StakeVoteRegistrationDelegation,
  Cardano.CertificateType.StakeVoteDelegation,
  Cardano.CertificateType.PoolRetirement,
]);

const certificateHasPoolId = (
  certificate: Cardano.HydratedCertificate,
): certificate is
  | Cardano.PoolRetirementCertificate
  | Cardano.StakeDelegationCertificate
  | Cardano.StakeRegistrationDelegationCertificate
  | Cardano.StakeVoteDelegationCertificate
  | Cardano.StakeVoteRegistrationDelegationCertificate => {
  return poolIdCertificateTypes.has(certificate.__typename);
};

/**
 * Get the pool ID from a certificate.
 * @param certificate - The certificate to get the pool ID from.
 * @returns The pool ID or undefined if the certificate does not have a pool ID.
 */
export const getPoolIdFromCertificate = (
  certificate: Cardano.HydratedCertificate,
): Cardano.PoolId | undefined => {
  if (certificate.__typename === Cardano.CertificateType.PoolRegistration)
    return certificate.poolParameters.id;

  if (certificateHasPoolId(certificate)) return certificate.poolId;

  return undefined;
};
