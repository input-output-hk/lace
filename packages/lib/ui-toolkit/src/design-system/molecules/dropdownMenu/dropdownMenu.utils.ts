export const isDropdownMenuItemSelected = (
  item: { id: string; text: string },
  selectedItemId?: string,
): boolean => {
  if (!selectedItemId) return false;

  return item.id === selectedItemId || item.text === selectedItemId;
};
