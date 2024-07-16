/* eslint-disable no-magic-numbers */
export const writeMnemonicToClipboard = async (mnemonic: string[], joiner = ' '): Promise<void> => {
  const copiedPhrase = mnemonic.join(joiner);
  await navigator.clipboard.writeText(copiedPhrase);
};

export const readMnemonicFromClipboard = async (limitTo = 24, offset = 0): Promise<string[]> => {
  const text = await navigator.clipboard.readText();
  navigator.clipboard.writeText('');
  const mnemonic = text.split(/[\s,]+/).slice(offset, limitTo);
  return mnemonic.length === 1 && !mnemonic[0] ? [] : mnemonic;
};
