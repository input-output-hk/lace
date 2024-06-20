export const downloadWalletData = (data: Record<string, unknown>, filename: string): void => {
  try {
    const indentation = 2;
    const blob = new Blob([JSON.stringify(data, undefined, indentation)], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();

    console.info(`JSON file downloaded and saved as ${filename}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to download JSON file: ${error.message}`);
    }
  }
};
