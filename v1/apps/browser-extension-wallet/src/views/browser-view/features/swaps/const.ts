/* eslint-disable no-magic-numbers */
export const SLIPPAGE_PERCENTAGES = [0.1, 0.5, 1, 2.5];
export const MAX_SLIPPAGE_PERCENTAGE = 50;
export const INITIAL_SLIPPAGE = 0.5;
export const ESTIMATE_VALIDITY_INTERVAL = 15_000; // Time in milliseconds (15 seconds) we consider an estimate valid

// Transaction TTL in seconds (15 minutes)
export const SWAP_TRANSACTION_TTL = 900;

// Token list pagination
export const TOKEN_LIST_PAGE_SIZE = 20;

// Steelswap only
export const LOVELACE_TOKEN_ID = 'lovelace'; // required for steelswap mapping only
export const LOVELACE_HEX_ID = 'lovelace414441'; // required for steelswap mapping only
