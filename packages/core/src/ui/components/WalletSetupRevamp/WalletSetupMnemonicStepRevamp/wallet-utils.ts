/* eslint-disable no-magic-numbers */
export const writeMnemonicToClipboard = async (mnemonic: string[], joiner = ' ') => {
  const copiedPhrase = mnemonic.join(joiner);
  await navigator.clipboard.writeText(copiedPhrase);
};

export const readMnemonicFromClipboard = async (limitTo = 24, offset = 0) => {
  const text = await navigator.clipboard.readText();
  return text.split(/[\s,]+/).slice(offset, limitTo);
};
