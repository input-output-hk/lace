import * as ProcedureTypes from '../components/ProcedureTypes';

export interface Data {
  procedure: ProcedureTypes.Procedure;
  protocolParamUpdate: ProtocolParamUpdate;
}

export interface NetworkGroup {
  maxBBSize: string;
  maxTxSize: string;
  maxBHSize: string;
  maxValSize: string;
  maxTxExUnits: {
    memory: string;
    step: string;
  };
  maxBlockExUnits: {
    memory: string;
    step: string;
  };
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
    dvtMotionNoConfidence: string;
    dvtCommitteeNormal: string;
    dvtCommitteeNoConfidence: string;
    dvtUpdateToConstitution: string;
    dvtHardForkInitiation: string;
    dvtPPNetworkGroup: string;
    dvtPPEconomicGroup: string;
    dvtPPTechnicalGroup: string;
    dvtPPGovGroup: string;
    dvtTreasuryWithdrawal: string;
  };
}

interface ProtocolParamUpdate {
  networkGroup: NetworkGroup;
  economicGroup: EconomicGroup;
  technicalGroup: TechnicalGroup;
  governanceGroup: GovernanceGroup;
}

export interface Translations {
  procedure: ProcedureTypes.Translations;
  networkGroup: {
    title: string;
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
        commiteeNoConfidence: string;
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
