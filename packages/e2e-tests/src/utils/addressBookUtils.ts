export const truncateAddressEntryName = (name: string): string => (name.length > 12 ? `${name.slice(0, 6)}...` : name);
