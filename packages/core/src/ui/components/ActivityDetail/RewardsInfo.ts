type RewardItem = {
  pool?: { name: string; ticker: string; id: string };
  amount: string;
};

export type RewardsInfo = {
  totalAmount: string;
  spendableEpoch: number;
  rewards: RewardItem[];
};
