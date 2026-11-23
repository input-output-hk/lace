export const inspectTransaction = async (hex: string, epoch: 'v8' | 'v9') => {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
    throw new Error(
      'Transaction must contain an even number of hexadecimal characters.',
    );
  }
  const bytes = Uint8Array.from(hex.match(/../g)!, byte => parseInt(byte, 16));
  const tx =
    epoch === 'v8'
      ? (await import('@midnightntwrk/ledger-v8')).Transaction.deserialize(
          'signature',
          'proof',
          'binding',
          bytes,
        )
      : (await import('@midnightntwrk/ledger-v9')).Transaction.deserialize(
          'signature',
          'proof',
          'binding',
          bytes,
        );
  return {
    epoch,
    identifiers: tx.identifiers(),
    intentIds: [...(tx.intents?.keys() ?? [])],
    imbalances: [...tx.imbalances(0)].map(([token, value]) => ({
      token,
      value,
    })),
    unshieldedOutputs: [...(tx.intents?.entries() ?? [])].flatMap(
      ([id, intent]) => [
        ...(intent.guaranteedUnshieldedOffer?.outputs ?? []).map(output => ({
          intentId: id,
          section: 'guaranteed',
          ...output,
        })),
        ...(intent.fallibleUnshieldedOffer?.outputs ?? []).map(output => ({
          intentId: id,
          section: 'fallible',
          ...output,
        })),
      ],
    ),
    shieldedOutputCount: tx.guaranteedOffer?.outputs.length ?? 0,
    limitation:
      'Decoded contents only. Proofs, signatures, fees and chain inclusion are not verified here. Shielded recipients require receiving-wallet verification.',
  };
};
