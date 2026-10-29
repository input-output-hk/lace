import {
  type Cardano,
  HandleOwnerChangeError,
  InvalidProtocolParametersError,
  NotImplementedError,
  ProviderFailure,
  reasonToProviderFailure,
} from '../src';

describe('core errors', () => {
  it('reasonToProviderFailure maps a known reason and falls back to Unknown', () => {
    expect(reasonToProviderFailure('NOT_FOUND')).toBe(ProviderFailure.NotFound);
    expect(reasonToProviderFailure(ProviderFailure.Unhealthy)).toBe(
      ProviderFailure.Unhealthy,
    );
    expect(reasonToProviderFailure('no such reason')).toBe(
      ProviderFailure.Unknown,
    );
  });

  it('the error classes carry their messages', () => {
    expect(new NotImplementedError('feature').message).toContain('feature');
    expect(
      new InvalidProtocolParametersError('missing maxTxSize').message,
    ).toContain('missing maxTxSize');
    const ownerChange = new HandleOwnerChangeError(
      'handle',
      'addr_test1expected' as Cardano.PaymentAddress,
      'addr_test1actual' as Cardano.PaymentAddress,
    );
    expect(ownerChange.message).toContain('handle');
    expect(ownerChange.message).toContain('addr_test1expected');
    expect(ownerChange.message).toContain('addr_test1actual');
  });
});
