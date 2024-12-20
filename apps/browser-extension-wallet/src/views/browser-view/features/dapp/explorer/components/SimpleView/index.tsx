import * as React from 'react';
import { useForm } from 'react-hook-form';

import SimpleViewContent from './SimpleViewContent';
import SimpleViewFilters from './SimpleViewFilters';
import { IogInput } from '../Form';
import useDebounce from '../../hooks/useDebounce';

import styles from './index.styles.module.scss';
import { DappListTitle } from '../../../ui/components/list/DappListTitle.component';

const { useState } = React;
const e2ePrefix = 'dapp-grid';

const dappsCategoryToTitle = (category: string) => (category === 'all' ? 'All DApps' : category);

const SimpleView: React.FC = () => {
  const { register, control, watch, resetField } = useForm({
    mode: 'onChange'
  });

  const [selectedCategory, setCategory] = useState<string>('all');

  const searchValue = watch('search');

  const search = useDebounce(searchValue);

  const formSearchOptions = {
    register,
    control,
    e2ePrefix
  };

  const handleClearField = (): void => {
    resetField('search');
  };

  return (
    <>
      <div className={styles.header}>
        <DappListTitle title={dappsCategoryToTitle(selectedCategory)} />
        <IogInput
          {...formSearchOptions}
          className={styles.searchInput}
          light
          type="search"
          name="search"
          label="Search"
          onClearField={handleClearField}
        />
      </div>
      <SimpleViewFilters onChangeCategory={setCategory} />
      <SimpleViewContent selectedCategory={selectedCategory} search={search} />
    </>
  );
};

export default SimpleView;
