import {
  DataSignError,
  DataSignErrorCode,
  PaginateError,
  TxSendError,
  TxSendErrorCode,
  TxSignError,
  TxSignErrorCode,
} from '../src';

describe('dapp-connector errors', () => {
  it('carry the CIP-30 code and info the dApp reads', () => {
    const dataSign = new DataSignError(
      DataSignErrorCode.AddressNotPK,
      'not a key address',
    );
    expect(dataSign.code).toBe(2);
    expect(dataSign.info).toBe('not a key address');
    expect(dataSign).toBeInstanceOf(Error);

    const txSend = new TxSendError(TxSendErrorCode.Refused, 'rate limited');
    expect(txSend.code).toBe(1);
    expect(txSend.info).toBe('rate limited');

    const txSign = new TxSignError(TxSignErrorCode.UserDeclined, 'declined');
    expect(txSign.code).toBe(2);
    expect(txSign.info).toBe('declined');

    const paginate = new PaginateError(10, 'page out of range');
    expect(paginate.maxSize).toBe(10);
    expect(paginate.message).toBe('page out of range');
  });
});
