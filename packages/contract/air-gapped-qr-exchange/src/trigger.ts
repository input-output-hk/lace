import { triggerAirGappedQrExchange } from './store/request';

/**
 * Cross-context bridge for the air-gapped QR exchange. Non-UI code (a signer or
 * the account-export connector, both running in the MV3 service worker) calls
 * {@link airGappedQrExchangeHook.trigger} to obtain an Observable of the device
 * response. The trigger is backed by a redux slice + SW side effect: the request
 * crosses to the view as redux state (pending exchange) and the scanned answer
 * returns as a redux action, mirroring the authentication prompt. This is what
 * makes a SW-side trigger reach the view-rendered scanner.
 *
 * The Observable surface is unchanged, so the signer/connector callers depend on
 * this contract (ADR-14) and are not modified.
 */
export const airGappedQrExchangeHook = {
  trigger: triggerAirGappedQrExchange,
};
