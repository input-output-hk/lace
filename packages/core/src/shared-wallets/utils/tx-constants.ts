const SHARED_WALLET_TX_VALIDITY_INTERVAL_IN_HOURS = Number(process.env.SHARED_WALLET_TX_VALIDITY_INTERVAL_IN_HOURS);

/* eslint-disable no-magic-numbers */
export const invalidHereafter = 3600 * SHARED_WALLET_TX_VALIDITY_INTERVAL_IN_HOURS; // 7 days from current slot for shared wallet tx
