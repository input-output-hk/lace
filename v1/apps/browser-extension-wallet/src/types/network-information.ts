export interface NetworkInformation {
  nextEpochIn: Date;
  currentEpochIn: Date;
  currentEpoch: string;
  stakePoolsAmount: string;
  totalStakedPercentage: string | number;
  totalStaked: { number: string; unit?: string };
}
