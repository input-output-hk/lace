import * as React from 'react';

import SimpleViewContent from './SimpleViewContent';
import SimpleViewFilters from './SimpleViewFilters';

import { DappListTitle } from '../../../ui/components/list/DappListTitle.component';
import { DefaultCategory } from '@views/browser/features/dapp/explorer/components/SimpleView/SimpleViewFilters/CategoryChip/categories.enum';
import { DrawerProvider } from '@views/browser/features/dapp/explorer/components/ProjectDetail/drawer';
import { Portal } from 'react-portal';
import ProjectDetail from '@views/browser/features/dapp/explorer/components/ProjectDetail';

const { useState } = React;
const dappsCategoryToTitle = (category: string) => (category === DefaultCategory.All ? 'All DApps' : category);

const SimpleView: React.FC = () => {
  const [selectedCategory, setCategory] = useState<string>(DefaultCategory.All);

  return (
    <DrawerProvider>
      <DappListTitle title={dappsCategoryToTitle(selectedCategory)} />
      <SimpleViewFilters onChangeCategory={setCategory} />
      <SimpleViewContent selectedCategory={selectedCategory} />
      <Portal node={document.querySelector('#dAppStore')}>
        <ProjectDetail selectedCategory={selectedCategory} />
      </Portal>
    </DrawerProvider>
  );
};

export default SimpleView;
