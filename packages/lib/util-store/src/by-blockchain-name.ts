export type BlockchainName = 'Bitcoin' | 'Cardano' | 'Midnight';
export type ByBlockchainName<T> = Partial<Record<BlockchainName, T>>;

export type BlockchainAssigned<T extends object = object> = T & {
  blockchainName: BlockchainName;
};

export const toItemsByBlockchainName = <Item extends BlockchainAssigned>(
  itemsList: Item[],
): ByBlockchainName<Item> =>
  itemsList
    .map(item => ({
      [item.blockchainName]: item,
    }))
    .reduce(
      (accumulator, item) => Object.assign(accumulator, item),
      {} as ByBlockchainName<Item>,
    );

export type ByBlockchainNameSelector<Item extends BlockchainAssigned> = (
  activeBlockchainName: BlockchainName,
) => Item | null;

export const createByBlockchainNameSelector = async <
  Item extends BlockchainAssigned,
>(
  itemsList: Item[] | Promise<Item[]>,
): Promise<ByBlockchainNameSelector<Item>> => {
  const itemsMap = toItemsByBlockchainName(await itemsList);
  return activeBlockchainName => {
    return itemsMap[activeBlockchainName] || null;
  };
};
