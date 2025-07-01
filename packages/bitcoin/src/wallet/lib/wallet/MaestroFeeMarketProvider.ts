/* eslint-disable no-magic-numbers */
import { EstimatedFees } from './BitcoinWallet';
import { FeeEstimationMode } from '../providers/BitcoinDataProvider';
import { MaestroBitcoinDataProvider } from '../providers/MaestroBitcoinDataProvider';
import { Network } from '../common/network';
import { Logger } from 'ts-log';
import { FeeMarketProvider } from './FeeMarketProvider';
import { DEFAULT_MARKETS } from './constants';

export class MaestroFeeMarketProvider implements FeeMarketProvider {
  constructor(
    private readonly provider: MaestroBitcoinDataProvider,
    private readonly logger: Logger,
    private readonly network: Network = Network.Mainnet
  ) {}

  async getFeeMarket(): Promise<EstimatedFees> {
    try {
      if (this.network === Network.Testnet) {
        return DEFAULT_MARKETS;
      }

      const fastEstimate = await this.provider.estimateFee(1, FeeEstimationMode.Economical);
      const standardEstimate = await this.provider.estimateFee(3, FeeEstimationMode.Economical);
      const slowEstimate = await this.provider.estimateFee(6, FeeEstimationMode.Economical);

      return {
        fast: {
          feeRate: fastEstimate.feeRate,
          targetConfirmationTime: fastEstimate.blocks * 10 * 60
        },
        standard: {
          feeRate: standardEstimate.feeRate,
          targetConfirmationTime: standardEstimate.blocks * 10 * 60
        },
        slow: {
          feeRate: slowEstimate.feeRate,
          targetConfirmationTime: slowEstimate.blocks * 10 * 60
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch fee market:', error);
    }

    return DEFAULT_MARKETS;
  }
}
