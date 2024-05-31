/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */
export const downloadWalletData = (data: Record<string, unknown>, filename: string): void => {
  try {
    const blob = new Blob([JSON.stringify(data, undefined, 2)], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();

    console.log(`JSON file downloaded and saved as ${filename}`);
  } catch (error) {
    console.error(`Failed to download JSON file: ${error.message}`);
  }
};
