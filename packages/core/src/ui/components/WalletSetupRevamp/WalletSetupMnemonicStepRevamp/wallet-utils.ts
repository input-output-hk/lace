/* eslint-disable no-magic-numbers */
export const writeMnemonicToClipboard = async (mnemonic: string[], joiner = ' ') => {
  const copiedPhrase = mnemonic.join(joiner);
  await navigator.clipboard.writeText(copiedPhrase);
};

export const readMnemonicFromClipboard = async (limitTo = 24) => {
  const text = await navigator.clipboard.readText();
  return text.split(/[\s,]+/).slice(0, limitTo);
};
