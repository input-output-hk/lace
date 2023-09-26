export const truncateAddressEntryName = (name: string): string => (name.length > 12 ? `${name.slice(0, 9)}...` : name);
