/* eslint-disable react/no-multi-comp */
import Icon from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { Ellipsis } from '@lace/common';
import { Flex, Text } from '@lace/ui';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Balance, CurrencyInfo } from '../../../outside-handles-provider';
import { DraftPortfolioStakePool } from '../../../store';
import ArrowDown from './arrow-down.svg';
import Cardano from './cardano-blue.png';
import styles from './StakePoolConfirmationBody.module.scss';

interface StakePoolConfirmationBodyProps {
  balance?: Balance;
  cardanoCoin: Wallet.CoinId;
  fiatCurrency: CurrencyInfo;
  stakePools: DraftPortfolioStakePool[];
}

const EllipsizedPoolName = ({ stakePool }: { stakePool: DraftPortfolioStakePool }) => {
  const maxRenderedLength = 15;
  const name = stakePool.displayData.name || '-';

  return (
    <Ellipsis
      beforeEllipsis={maxRenderedLength}
      withTooltip={name.length > maxRenderedLength}
      afterEllipsis={0}
      text={name}
    />
  );
};

type StatRendererProps = {
  img?: string;
  text: React.ReactNode;
  subText: React.ReactNode;
};

const ItemStatRenderer = ({ img, text, subText }: StatRendererProps) => (
  <div>
    {img && <img data-testid="sp-confirmation-item-logo" src={img} alt="confirmation item" />}
    <div className={styles.itemData}>
      <div className={styles.dataTitle} data-testid="sp-confirmation-item-text">
        {text}
      </div>
      <div className={styles.dataSubTitle} data-testid="sp-confirmation-item-subtext">
        {subText}
      </div>
    </div>
  </div>
);

export const StakePoolConfirmationBody = ({
  balance,
  cardanoCoin,
  fiatCurrency,
  stakePools,
}: StakePoolConfirmationBodyProps) => {
  const { t } = useTranslation();

  return (
    <div className={styles.body}>
      <div className={styles.item} data-testid="sp-confirmation-delegate-from-container">
        <ItemStatRenderer img={Cardano} text={t('drawer.confirmation.cardanoName')} subText={cardanoCoin.symbol} />
        <ItemStatRenderer
          text={balance?.total?.coinBalance ?? '0'}
          subText={`${balance?.total?.fiatBalance ?? '-'} ${fiatCurrency?.code}`}
        />
      </div>
      <Icon style={{ color: '#702BED', fontSize: '24px', margin: '12px 0px' }} component={ArrowDown} />
      {stakePools.length > 0 ? (
        stakePools.map((stakePool) => (
          <div
            key={stakePool.id}
            className={cn(styles.item, styles.itemMulti)}
            data-testid="sp-confirmation-delegate-to-container"
          >
            <ItemStatRenderer
              img={stakePool.displayData.logo}
              text={<EllipsizedPoolName stakePool={stakePool} />}
              subText={<span>{stakePool.displayData.ticker}</span>}
            />
            <div className={styles.itemData}>
              <Ellipsis beforeEllipsis={10} afterEllipsis={8} text={stakePool.id} ellipsisInTheMiddle />
            </div>
          </div>
        ))
      ) : (
        <Flex justifyContent="center">
          <Text.Body.Large className={styles.noPoolsText} weight="$semibold">
            {t('drawer.confirmation.noPools')}
          </Text.Body.Large>
        </Flex>
      )}
    </div>
  );
};
