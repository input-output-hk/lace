export const setClipboardReadPermission = async (state: 'denied' | 'granted' | 'prompted'): Promise<void> => {
  await driver.setPermissions({ name: 'clipboard-read' }, state);
};

export const setCameraAccessPermission = async (state: 'denied' | 'granted' | 'prompted'): Promise<void> => {
  await driver.setPermissions({ name: 'camera' }, state);
};
