import { Asset } from '../data/Asset';

interface Cost {
  percentage: number;
  ada: number;
}

const emojiRegex =
  // eslint-disable-next-line max-len
  /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

const parseCostStringToObject = (cost: string): Cost => {
  let parsedItem: Cost = { percentage: 0, ada: 0 };
  if (cost.includes('%') && cost.includes('ADA')) {
    const splitItem = cost.split('+');
    parsedItem = {
      percentage: Number.parseFloat(splitItem[0].replace(/%/, '')),
      ada: Number.parseFloat(splitItem[1].replace(/ADA/, ''))
    };
  }

  if (cost.includes('%') && !cost.includes(Asset.CARDANO.ticker)) {
    parsedItem = {
      percentage: Number.parseFloat(cost.replace(/%/, '')),
      ada: 0
    };
  }

  if (!cost.includes('%') && cost.includes(Asset.CARDANO.ticker)) {
    parsedItem = {
      percentage: 0,
      ada: Number.parseFloat(cost.replace(/ADA/, ''))
    };
  }

  return parsedItem;
};

const parseCostObjectToString = (cost: Cost): string => {
  let parsedItem = `${Number(cost.percentage).toFixed(2)}%`;

  if (cost.ada > 0) {
    parsedItem = `${parsedItem} + ${Number(cost.ada)}${Asset.CARDANO.ticker}`;
  }

  return parsedItem;
};

export const sortNameColumn = (columnContent: string[], order: string): string[] => {
  const itemsWithNoName = columnContent.filter((item) => item === '-');
  const itemsWithName = columnContent.filter((item) => item !== '-');

  const sortedItems = [...itemsWithName].sort((a, b) => {
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    const nameA = a.replace(emojiRegex, '').replace(' ', '').trim();
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    const nameB = b.replace(emojiRegex, '').replace(' ', '').trim();
    return nameA.localeCompare(nameB);
  });
  if (order === 'descending') {
    sortedItems.reverse();
  }
  sortedItems.push(...itemsWithNoName);

  return sortedItems;
};

export const sortCostColumn = (columnContent: string[], order: string): string[] => {
  const parsedColumnContent = columnContent.map((item) => parseCostStringToObject(item));
  const costSorted = [...parsedColumnContent].sort((a, b) => a.ada - b.ada || a.percentage - b.percentage);
  if (order === 'descending') {
    costSorted.reverse();
  }
  return costSorted.map((item) => parseCostObjectToString(item));
};

export const sortColumnWithPercentageValues = (columnContent: string[], order: string): string[] => {
  const columnContentWithNumbers = columnContent.map((item) => Number.parseFloat(item.replace(/%/, '')));
  const sortedColumnContentWithNumbers = [...columnContentWithNumbers].sort((a, b) => a - b);
  if (order === 'descending') {
    sortedColumnContentWithNumbers.reverse();
  }
  return sortedColumnContentWithNumbers.map((item) => String(`${item}%`));
};

export const sortColumnContent = async (
  columnContent: string[],
  columnName: string,
  order: string
): Promise<string[]> => {
  let sortedColumnContent: string[] = [];

  if (columnName === 'name') {
    sortedColumnContent = sortNameColumn(columnContent, order);
  }

  if (['ros', 'saturation'].includes(columnName)) {
    sortedColumnContent = sortColumnWithPercentageValues(columnContent, order);
  }

  if (columnName === 'cost') {
    sortedColumnContent = sortCostColumn(columnContent, order);
  }

  return sortedColumnContent;
};
