import React from 'react';
import { AssetInfo, Sections } from '../../types';
import { AddressInput } from './AddressInput';
import { CoinInput } from './CoinInput';
import { FormRowHeader } from './FormRowHeader';
import { RowContainer } from './RowContainer';
import { useCurrentRow, useOutputs, useSections } from '../../store';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';
import { useObservable } from '@lace/common';
import { Tokens } from '@src/types';

const cardanoAssetId = '1';

interface Props {
  isPopupView: boolean;
  coinBalance: string;
  isBundle: boolean;
  insufficientBalanceInputs: string[];
  insufficientAvailableBalanceInputs: string[];
  reachedMaxAmountList: Set<string | Wallet.Cardano.AssetId>;
  assets: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
  setIsBundle: (value: boolean) => void;
  assetBalances: Tokens;
  spendableCoin: bigint;
}

export const BundlesList = ({
  isPopupView,
  coinBalance,
  isBundle,
  setIsBundle,
  insufficientBalanceInputs,
  insufficientAvailableBalanceInputs,
  reachedMaxAmountList,
  assets,
  assetBalances,
  spendableCoin
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const { setSection } = useSections();
  const { ids, uiOutputs, removeExistingOutput } = useOutputs();
  const { currentChain, inMemoryWallet } = useWalletStore();
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);

  const [row, setCurrentRow] = useCurrentRow();

  const canAddMoreAssets = (outputId: string): boolean => {
    const assetsIdsUsedInOutput = new Set(uiOutputs[outputId].assets.map(({ id }: AssetInfo) => id));

    return (
      (!reachedMaxAmountList.has(cardanoAssetId) && !assetsIdsUsedInOutput.has(cardanoAssetId)) ||
      (!!balance?.assets?.size &&
        balance?.assets &&
        [...balance.assets].some(
          ([id]) => !reachedMaxAmountList.has(id.toString()) && !assetsIdsUsedInOutput.has(id.toString())
        ))
    );
  };

  const handleAssetPicker = (outputId: string, coinId?: string) => {
    setSection({ currentSection: Sections.ASSET_PICKER, prevSection: Sections.FORM });
    setCurrentRow(outputId, coinId);
    setIsBundle(false);
  };

  const handleRemoveRow = (id: string) => removeExistingOutput(id);

  return (
    <>
      {ids.map((bundleId, idx) => (
        <RowContainer
          key={bundleId}
          id={bundleId}
          focusRow={row}
          data-testid="asset-bundle-container"
          isBundle={isBundle}
        >
          {ids.length > 1 && (
            <FormRowHeader
              title={t('browserView.transaction.send.advanced.bundleTitle', { index: idx + 1 })}
              onDeleteRow={() => handleRemoveRow(bundleId)}
            />
          )}
          <AddressInput row={bundleId} currentNetwork={currentChain.networkId} isPopupView={isPopupView} />
          <CoinInput
            isPopupView={isPopupView}
            bundleId={bundleId}
            assets={assets}
            assetBalances={assetBalances}
            coinBalance={coinBalance}
            insufficientBalanceInputs={insufficientBalanceInputs}
            insufficientAvailableBalanceInputs={insufficientAvailableBalanceInputs}
            onAddAsset={() => handleAssetPicker(bundleId)}
            openAssetPicker={(coinId) => handleAssetPicker(bundleId, coinId)}
            canAddMoreAssets={canAddMoreAssets(bundleId)}
            spendableCoin={spendableCoin}
          />
        </RowContainer>
      ))}
    </>
  );
};
