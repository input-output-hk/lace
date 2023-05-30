export const getElectronBaseURL = async (): Promise<string> => {
  const currentUrl = await browser.getUrl();
  return currentUrl.split('#/')[0];
};
