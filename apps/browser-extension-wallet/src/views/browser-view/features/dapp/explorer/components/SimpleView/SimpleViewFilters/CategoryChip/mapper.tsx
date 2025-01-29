import * as React from 'react';
import { DefaultCategory } from './categories.enum';
import Games from './assets/game.component.svg';
import Marketplace from './assets/marketplace.component.svg';
import Collectibles from './assets/collectibles.component.svg';
import Other from './assets/other.component.svg';
import ShowAll from '../../../../../../../../../assets/icons/tiles-outlined.component.svg';
import Defi from './assets/defi.component.svg';
import ArrowChartUp from '../../../../../../../../../assets/icons/arrow-chart-up.component.svg';
import ArrowsOppositeDirection from '../../../../../../../../../assets/icons/arrows-opposite-direction.component.svg';
import Ticket from '../../../../../../../../../assets/icons/ticket-icon.component.svg';
import Persons from '../../../../../../../../../assets/icons/persons.component.svg';
import { dappCategoriesEnumSchema } from '@lib/scripts/types/feature-flags';

const mapOfCategoryToIcon: Record<DefaultCategory, React.ComponentType> = {
  [DefaultCategory.All]: ShowAll,
  [DefaultCategory.Games]: Games,
  [DefaultCategory.Defi]: Defi,
  [DefaultCategory.Collectibles]: Collectibles,
  [DefaultCategory.Marketplaces]: Marketplace,
  [DefaultCategory.HighRisk]: ArrowChartUp,
  [DefaultCategory.Gambling]: Ticket,
  [DefaultCategory.Exchanges]: ArrowsOppositeDirection,
  [DefaultCategory.Social]: Persons,
  [DefaultCategory.Other]: Other
};

const isOneOfDefaultCategories = (category: string): category is DefaultCategory =>
  dappCategoriesEnumSchema.safeParse(category).success || category === DefaultCategory.All;

export const mapCategory = (category: string): React.ReactNode => {
  // eslint-disable-next-line unicorn/no-null
  const Icon = isOneOfDefaultCategories(category) ? mapOfCategoryToIcon[category] : null;
  return Icon && <Icon />;
};
