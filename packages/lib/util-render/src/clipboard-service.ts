const checkPermissions = async () => {
  try {
    const readPermissions = await navigator.permissions.query({
      name: 'clipboard-read' as PermissionName,
    });
    const writePermissions = await navigator.permissions.query({
      name: 'clipboard-write' as PermissionName,
    });

    return {
      read: readPermissions.state === 'granted',
      write: writePermissions.state === 'granted',
    };
  } catch {
    return {
      read: false,
      write: false,
    };
  }
};

/**
 * Writes text to navigator's clipboard
 * @param text
 */
const write = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

/**
 * Reads text from navigator's clipboard
 */
const read = async () => {
  let text = '';
  try {
    text = await navigator.clipboard.readText();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.info(`Clipboard read failed, permissions are not granted`, error);
  }

  return text;
};

/**
 * Erases text from the navigator's clipboard
 */
const erase = async () => {
  await write('');
};

export const clipboardService = {
  checkPermissions,
  erase,
  read,
  write,
};
