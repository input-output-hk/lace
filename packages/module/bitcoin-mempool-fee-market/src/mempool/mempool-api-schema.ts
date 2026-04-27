/**
 * Represents the response from the mempool.space fee endpoint,
 * which includes fee estimate data.
 */
export interface MempoolSpaceFeeEstimateResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}
