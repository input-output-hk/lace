// Branded address types from @lace-contract/cardano-context. Distinct from
// @cardano-sdk/core's Cardano.{PaymentAddress,RewardAccount,...} brands;
// re-exported here so consumers can construct provider-arg-compatible
// values without depending on the contract package directly.
export {
  CardanoAddress,
  CardanoBaseAddress,
  CardanoEnterpriseAddress,
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
