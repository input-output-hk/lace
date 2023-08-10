/* eslint-disable sonarjs/cognitive-complexity, promise/catch-or-return */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { Drawer, DrawerHeader, DrawerNavigation, toast } from '@lace/common';
import { ConnectedDappList, connectedDappProps } from '@lace/core';
import { DeleteDappModal } from './DeleteDappModal';
import { DappListEmpty } from './DappListEmpty';
import styles from './DappList.module.scss';
import DeleteIcon from '../../../../../../assets/icons/delete-icon.component.svg';
import { useDappContext, withDappContext } from '@src/features/dapp/context';
import { Wallet } from '@lace/cardano';
import { localDappService } from './localDappService';

const { Text } = Typography;

const TOAST_DEFAULT_DURATION = 3; // TODO: coalesce with other variables

export type DappListProps = {
  onCancelClick: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
  visible: boolean;
  popupView?: boolean;
};

export const DappList = withDappContext(
  ({ onCancelClick, visible, popupView = false }: DappListProps): React.ReactElement => {
    const { t } = useTranslation();
    const connectedDapps = useDappContext();
    const [dappToDelete, setDappToDelete] = useState<Wallet.DappInfo>();
    const list: connectedDappProps[] = useMemo(
      () =>
        connectedDapps?.map((dapp: Wallet.DappInfo) => ({
          ...dapp,
          url: dapp.url.replace(/^https?:\/\/(www.)?/, ''),
          onDelete: () => setDappToDelete(dapp)
        })) || [],
      [setDappToDelete, connectedDapps]
    );

    const hasConnectedDapps = connectedDapps?.length > 0;

    return (
      <Drawer
        width={popupView ? '100%' : undefined}
        className={styles.drawer}
        onClose={onCancelClick}
        title={<DrawerHeader popupView={popupView} title={t('dapp.list.title')} />}
        navigation={
          <DrawerNavigation
            title={t('browserView.settings.heading')}
            onCloseIconClick={!popupView ? onCancelClick : undefined}
            onArrowIconClick={popupView ? onCancelClick : undefined}
          />
        }
        open={visible}
        popupView={popupView}
      >
        <>
          <Text className={styles.description} data-testid="dapp-list-subtitle">
            {hasConnectedDapps ? t('dapp.list.subTitle') : t('dapp.list.subTitleEmpty')}
          </Text>
          {visible &&
            (hasConnectedDapps ? (
              <div>
                <div className={styles.list}>
                  <ConnectedDappList
                    items={list}
                    locale={{ emptyText: true }}
                    total={connectedDapps.length}
                    popupView={popupView}
                  />
                </div>
                <DeleteDappModal
                  // eslint-disable-next-line unicorn/no-null
                  onCancel={() => setDappToDelete(null)}
                  onConfirm={() => {
                    localDappService
                      .removeAuthorizedDapp(dappToDelete.url)
                      .then((successful: boolean) => {
                        if (successful) {
                          toast.notify({
                            text: t('dapp.list.removedSuccess'),
                            duration: TOAST_DEFAULT_DURATION,
                            icon: DeleteIcon
                          });
                        } else {
                          throw new Error(t('dapp.list.removedFailure'));
                        }
                      })
                      .catch((error) => {
                        toast.notify({
                          text: error,
                          duration: TOAST_DEFAULT_DURATION
                        });
                        throw new Error(error);
                      })
                      .finally(() => {
                        // eslint-disable-next-line unicorn/no-useless-undefined
                        setDappToDelete(undefined);
                      });
                  }}
                  open={!!dappToDelete}
                  isPopupView={popupView}
                />
              </div>
            ) : (
              <div className={styles.container}>
                <DappListEmpty />
              </div>
            ))}
        </>
      </Drawer>
    );
  }
);
