import * as React from 'react';
import { DefaultCategory } from './categories.enum';
import Development from './assets/development.component.svg';
import Games from './assets/game.component.svg';
import Marketplace from './assets/marketplace.component.svg';
import Collectibles from './assets/collectibles.component.svg';
import Other from './assets/other.component.svg';
import ShowAll from './assets/all.component.svg';
import Defi from './assets/defi.component.svg';
import Icon from '@ant-design/icons';

const mapOfCategoryToIcon: Record<DefaultCategory, React.ComponentType> = {
  [DefaultCategory.All]: ShowAll,
  [DefaultCategory.Games]: Games,
  [DefaultCategory.Defi]: Defi,
  [DefaultCategory.Collectibles]: Collectibles,
  [DefaultCategory.Marketplaces]: Marketplace,
  [DefaultCategory.HighRisk]: Development,
  [DefaultCategory.Gambling]: Development,
  [DefaultCategory.Exchanges]: Development,
  [DefaultCategory.Social]: Development,
  [DefaultCategory.Other]: Other
};

const isOneOfDefaultCategories = (category: string): category is DefaultCategory =>
  Object.values<string>(DefaultCategory).includes(category);

export const mapCategory = (category: string): React.ReactNode => {
  // eslint-disable-next-line unicorn/no-null
  const icon = isOneOfDefaultCategories(category) ? mapOfCategoryToIcon[category] : null;
  return icon && <Icon component={icon} />;
};
