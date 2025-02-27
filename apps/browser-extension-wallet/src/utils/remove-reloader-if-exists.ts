export const removePreloaderIfExists = (): void => {
  document.querySelector('#preloader')?.remove();
};
