import { realfiDebugLog } from '@lace-contract/realfi-staking';
import { RealfiApi } from '@realfi-co/realfi-partner-sdk';

/** Preserve the SDK's simple annualized fraction, including zero and losses.
 * The SDK caps the window at the backend's earliest usable history. */
export const fetchStakingYield = async (
  realfiApiUrl: string,
): Promise<{ apy: number } | undefined> => {
  try {
    const api = RealfiApi.create({
      realfiUrl: realfiApiUrl,
      assetTransparencyUrl: realfiApiUrl,
    });
    const apy = await api.getSusdrAPY('30d');
    return Number.isFinite(apy) ? { apy } : undefined;
  } catch (error) {
    realfiDebugLog('30-day historical APY read failed', { error });
    return undefined;
  }
};
