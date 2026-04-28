import type * as ProcedureTypes from '../components/ProcedureTypes';
import type * as TxDetailsTypes from '../components/ProposalProcedureTransactionDetailsTypes';

export type DeepPartial<T> = T extends Record<string, unknown>
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export interface Data {
  protocolParamUpdate: DeepPartial<ProtocolParameterUpdate>;
  txDetails: TxDetailsTypes.TxDetails;
  procedure: {
    anchor: ProcedureTypes.Procedure['anchor'];
  };
}

export interface NetworkGroup {
  maxBBSize: string;
  maxTxSize: string;
  maxBHSize: string;
  maxValSize: string;
  maxCollateralInputs: string;
}

export interface EconomicGroup {
  minFeeA: string;
  minFeeB: string;
  keyDeposit: string;
  poolDeposit: string;
  rho: string;
  tau: string;
  minPoolCost: string;
  coinsPerUTxOByte: string;
  price: {
    memory: string;
    step: string;
  };
}

export interface TechnicalGroup {
  a0: string;
  eMax: string;
  nOpt: string;
  costModels: {
    PlutusV1: Record<string, string>;
    PlutusV2: Record<string, string>;
  };
  collateralPercentage: string;
}

export interface GovernanceGroup {
  govActionLifetime: string;
  govActionDeposit: string;
  drepDeposit: string;
  drepActivity: string;
  ccMinSize: string;
  ccMaxTermLength: string;
  dRepVotingThresholds: {
    motionNoConfidence: string;
    committeeNormal: string;
    committeeNoConfidence: string;
    updateConstitution: string;
    hardForkInitiation: string;
    ppNetworkGroup: string;
    ppEconomicGroup: string;
    ppTechnicalGroup: string;
    ppGovernanceGroup: string;
    treasuryWithdrawal: string;
  };
}

interface ProtocolParameterUpdate {
  maxTxExUnits: {
    memory: string;
    step: string;
  };
  maxBlockExUnits: {
    memory: string;
    step: string;
  };
  networkGroup: NetworkGroup;
  economicGroup: EconomicGroup;
  technicalGroup: TechnicalGroup;
  governanceGroup: GovernanceGroup;
}

export interface Translations {
  txDetails: TxDetailsTypes.Translations;
  anchor: ProcedureTypes.Translations['anchor'];
  memory: string;
  step: string;
  networkGroup: {
    title: string;
    maxBBSize: string;
    maxTxSize: string;
    maxBHSize: string;
    maxValSize: string;
    maxTxExUnits: string;
    maxBlockExUnits: string;
    maxCollateralInputs: string;
    tooltip: {
      maxBBSize: string;
      maxTxSize: string;
      maxBHSize: string;
      maxValSize: string;
      maxTxExUnits: string;
      maxBlockExUnits: string;
      maxCollateralInputs: string;
    };
  };
  economicGroup: {
    title: string;
    minFeeA: string;
    minFeeB: string;
    keyDeposit: string;
    poolDeposit: string;
    rho: string;
    tau: string;
    minPoolCost: string;
    coinsPerUTxOByte: string;
    prices: string;
    tooltip: {
      minFeeA: string;
      minFeeB: string;
      keyDeposit: string;
      poolDeposit: string;
      rho: string;
      tau: string;
      minPoolCost: string;
      coinsPerUTxOByte: string;
      prices: string;
    };
  };
  technicalGroup: {
    title: string;
    a0: string;
    eMax: string;
    nOpt: string;
    costModels: string;
    collateralPercentage: string;
    tooltip: {
      a0: string;
      eMax: string;
      nOpt: string;
      costModels: string;
      collateralPercentage: string;
    };
  };
  governanceGroup: {
    title: string;
    govActionLifetime: string;
    govActionDeposit: string;
    drepDeposit: string;
    drepActivity: string;
    ccMinSize: string;
    ccMaxTermLength: string;
    dRepVotingThresholds: {
      title: string;
      motionNoConfidence: string;
      committeeNormal: string;
      committeeNoConfidence: string;
      updateConstitution: string;
      hardForkInitiation: string;
      ppNetworkGroup: string;
      ppEconomicGroup: string;
      ppTechnicalGroup: string;
      ppGovernanceGroup: string;
      treasuryWithdrawal: string;
    };
    tooltip: {
      govActionLifetime: string;
      govActionDeposit: string;
      drepDeposit: string;
      drepActivity: string;
      ccMinSize: string;
      ccMaxTermLength: string;
      dRepVotingThresholds: {
        title: string;
        motionNoConfidence: string;
        committeeNormal: string;
        committeeNoConfidence: string;
        updateConstitution: string;
        hardForkInitiation: string;
        ppNetworkGroup: string;
        ppEconomicGroup: string;
        ppTechnicalGroup: string;
        ppGovernanceGroup: string;
        treasuryWithdrawal: string;
      };
    };
  };
}
