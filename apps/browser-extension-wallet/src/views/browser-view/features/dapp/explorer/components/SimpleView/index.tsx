import * as React from 'react';

import SimpleViewContent from './SimpleViewContent';
import SimpleViewFilters from './SimpleViewFilters';

import { DappListTitle } from '../../../ui/components/list/DappListTitle.component';

const { useState } = React;
const dappsCategoryToTitle = (category: string) => (category === 'all' ? 'All DApps' : category);

const SimpleView: React.FC = () => {
  const [selectedCategory, setCategory] = useState<string>('all');

  return (
    <>
      <DappListTitle title={dappsCategoryToTitle(selectedCategory)} />
      <SimpleViewFilters onChangeCategory={setCategory} />
      <SimpleViewContent selectedCategory={selectedCategory} />
    </>
  );
};

export default SimpleView;
