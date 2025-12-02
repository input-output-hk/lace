import { useEffect, useState } from 'react';
import { useObservable, logger } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { config } from '@src/config';

interface BlockfrostComparisonData {
  stakeAddress: string;
  blockfrostRewardsSum: string;
  blockfrostRewardsSumADA: string;
  laceRewardsSum: string;
  laceRewardsSumADA: string;
  difference: string;
  blockfrostControlledAmount: string;
  blockfrostControlledAmountADA: string;
  timestamp: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

const LOVELACE_TO_ADA = 1_000_000;
const DECIMAL_PLACES = 6;
const PERFECT_MATCH_THRESHOLD = 0.000_001;
const MINOR_DIFFERENCE_THRESHOLD = 0.001;
const HTTP_FORBIDDEN = 403;

export const useBlockfrostComparison = (
  laceRewardsSum: string,
  laceRewardsSumADA: number
): {
  comparisonData: BlockfrostComparisonData | undefined;
  isLoading: boolean;
  stakeAddress: string | undefined;
} => {
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const [comparisonData, setComparisonData] = useState<BlockfrostComparisonData | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  // eslint-disable-next-line sonarjs/cognitive-complexity, max-statements
  useEffect(() => {
    // eslint-disable-next-line max-statements
    const fetchBlockfrostComparison = async () => {
      try {
        // Get the stake address from the wallet's reward accounts
        const stakeAddress = rewardAccounts?.[0]?.address;
        if (!stakeAddress) {
          logger.info('🔍 [BLOCKFROST_DEBUG] No stake address available for comparison');
          return;
        }

        setIsLoading(true);
        logger.info('🔍 [BLOCKFROST_DEBUG] Fetching Blockfrost data for stake address:', stakeAddress);

        // Use Blockfrost endpoint from config (supports all networks)
        const blockfrostConfig = config().BLOCKFROST_CONFIGS.Mainnet;
        const blockfrostUrl = `${blockfrostConfig.baseUrl}/api/v0/accounts/${stakeAddress}`;

        logger.info('🔍 [BLOCKFROST_DEBUG] Using Blockfrost config:', {
          baseUrl: blockfrostConfig.baseUrl,
          hasProjectId: !!blockfrostConfig.projectId
        });

        // Use the project ID from config if available
        const headers: Record<string, string> = {
          Accept: 'application/json'
        };

        if (blockfrostConfig.projectId) {
          headers['project-id'] = blockfrostConfig.projectId;
          logger.info('🔍 [BLOCKFROST_DEBUG] Using Blockfrost project ID from config');
        } else {
          logger.info('🔍 [BLOCKFROST_DEBUG] No Blockfrost project ID in config - API calls may be rate-limited');
        }

        const response = await fetch(blockfrostUrl, { headers });

        if (response.ok) {
          const blockfrostData = await response.json();
          logger.info('🔍 [BLOCKFROST_DEBUG] === BLOCKFROST COMPARISON ===');
          logger.info('🔍 [BLOCKFROST_DEBUG] Blockfrost rewards_sum:', blockfrostData.rewards_sum);
          logger.info(
            '🔍 [BLOCKFROST_DEBUG] Blockfrost rewards_sum in ADA:',
            `${(Number(blockfrostData.rewards_sum) / LOVELACE_TO_ADA).toFixed(DECIMAL_PLACES)}`
          );
          logger.info('🔍 [BLOCKFROST_DEBUG] Blockfrost controlled_amount:', blockfrostData.controlled_amount);
          logger.info(
            '🔍 [BLOCKFROST_DEBUG] Blockfrost controlled_amount in ADA:',
            `${(Number(blockfrostData.controlled_amount) / LOVELACE_TO_ADA).toFixed(DECIMAL_PLACES)}`
          );

          // Compare Lace vs Blockfrost
          const blockfrostRewardsADA = Number(blockfrostData.rewards_sum) / LOVELACE_TO_ADA;
          const difference = Math.abs(blockfrostRewardsADA - laceRewardsSumADA);

          logger.info('🔍 [BLOCKFROST_DEBUG] === COMPARISON RESULTS ===');
          logger.info(
            '🔍 [BLOCKFROST_DEBUG] Lace calculated rewards_sum:',
            `${laceRewardsSumADA.toFixed(DECIMAL_PLACES)} ADA`
          );
          logger.info(
            '🔍 [BLOCKFROST_DEBUG] Blockfrost rewards_sum:',
            `${blockfrostRewardsADA.toFixed(DECIMAL_PLACES)} ADA`
          );
          logger.info('🔍 [BLOCKFROST_DEBUG] Difference:', `${difference.toFixed(DECIMAL_PLACES)} ADA`);

          if (difference < PERFECT_MATCH_THRESHOLD) {
            logger.info('🔍 [BLOCKFROST_DEBUG] ✅ PERFECT MATCH: Lace and Blockfrost rewards_sum are identical');
          } else if (difference < MINOR_DIFFERENCE_THRESHOLD) {
            logger.info('🔍 [BLOCKFROST_DEBUG] ⚠️ MINOR DIFFERENCE: Small discrepancy (possibly rounding)');
          } else {
            logger.info('🔍 [BLOCKFROST_DEBUG] ❌ SIGNIFICANT DIFFERENCE: Data integrity issue detected!');
            logger.info(
              '🔍 [BLOCKFROST_DEBUG] This suggests Lace is missing reward records or there is an API data issue'
            );
          }

          // Store comparison data for UI access
          const blockfrostComparisonData: BlockfrostComparisonData = {
            stakeAddress,
            blockfrostRewardsSum: blockfrostData.rewards_sum,
            blockfrostRewardsSumADA: blockfrostRewardsADA.toFixed(DECIMAL_PLACES),
            laceRewardsSum,
            laceRewardsSumADA: laceRewardsSumADA.toFixed(DECIMAL_PLACES),
            difference: difference.toFixed(DECIMAL_PLACES),
            blockfrostControlledAmount: blockfrostData.controlled_amount,
            blockfrostControlledAmountADA: (Number(blockfrostData.controlled_amount) / LOVELACE_TO_ADA).toFixed(
              DECIMAL_PLACES
            ),
            timestamp: new Date().toISOString(),
            status: 'success'
          };

          setComparisonData(blockfrostComparisonData);

          // Store in global window for debugging
          if (typeof window !== 'undefined') {
            (window as unknown as Record<string, unknown>).blockfrostComparison = blockfrostComparisonData;
          }
        } else {
          logger.error(
            '🔍 [BLOCKFROST_DEBUG] ❌ Failed to fetch Blockfrost data:',
            response.status,
            response.statusText
          );
          if (response.status === HTTP_FORBIDDEN) {
            logger.info(
              '🔍 [BLOCKFROST_DEBUG] 💡 Tip: Blockfrost API key required. Check environment variables for BLOCKFROST_PROJECT_ID_MAINNET'
            );
          }

          const errorData: BlockfrostComparisonData = {
            stakeAddress: '',
            blockfrostRewardsSum: '',
            blockfrostRewardsSumADA: '',
            laceRewardsSum,
            laceRewardsSumADA: laceRewardsSumADA.toFixed(DECIMAL_PLACES),
            difference: '',
            blockfrostControlledAmount: '',
            blockfrostControlledAmountADA: '',
            timestamp: new Date().toISOString(),
            status: 'error',
            error: `HTTP ${response.status}: ${response.statusText}`
          };

          setComparisonData(errorData);
        }
      } catch (error) {
        logger.error('🔍 [BLOCKFROST_DEBUG] ❌ Error fetching Blockfrost data:', error);

        const errorData: BlockfrostComparisonData = {
          stakeAddress: '',
          blockfrostRewardsSum: '',
          blockfrostRewardsSumADA: '',
          laceRewardsSum,
          laceRewardsSumADA: laceRewardsSumADA.toFixed(DECIMAL_PLACES),
          difference: '',
          blockfrostControlledAmount: '',
          blockfrostControlledAmountADA: '',
          timestamp: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        setComparisonData(errorData);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have both the stake address and Lace rewards data
    if (rewardAccounts?.[0]?.address && laceRewardsSum && laceRewardsSumADA > 0) {
      fetchBlockfrostComparison();
    }
  }, [rewardAccounts, laceRewardsSum, laceRewardsSumADA]);

  return {
    comparisonData,
    isLoading,
    stakeAddress: rewardAccounts?.[0]?.address
  };
};
