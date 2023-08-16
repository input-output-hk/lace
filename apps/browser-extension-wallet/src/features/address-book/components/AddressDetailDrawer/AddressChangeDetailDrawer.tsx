/* eslint-disable no-empty-pattern */
import React from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerNavigation, DrawerHeader } from '@lace/common';
import styles from './AddressChangeDetailDrawer.module.scss';
import { AddressChangeDetail } from '../AddressChangeDetail';
import { Footer } from '@src/views/browser-view/features/send-transaction/components/SendTransactionDrawer';
import { Sections, useSections } from '@src/views/browser-view/features/send-transaction';

type InitialValuesProps = {
  address?: string;
  id?: number;
  name?: string;
};

type AddressChangeDetailDrawerProps = {
  initialValues: InitialValuesProps;
  visible: boolean;
  expectedAddress: string;
  actualAddress: string;
  popupView?: boolean;
  onCancelClick?: (event?: React.MouseEvent<HTMLButtonElement>) => unknown;
};

export const AddressChangeDetailDrawer = ({
  initialValues,
  onCancelClick,
  visible,
  popupView,
  expectedAddress,
  actualAddress
}: AddressChangeDetailDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setSection } = useSections();
  // const [selectedId, setSelectedSelectedId] = useState<number | null>();
  // const [action, setAction] = useState<typeof ACTIONS.UPDATE | typeof ACTIONS.DELETE | null>();
  // const [actualAddressHasBeenCopied, setActualAddressHasBeenCopied] = useState(false);
  // const [expectedAddressHasBeenCopied, setExpectedAddressHasBeenCopied] = useState(false);
  // const analytics = useAnalyticsContext();

  // const handleExpectedAddressOnClickCopy = () => {
  //   toast.notify({
  //     text: t('general.clipboard.copiedToClipboard'),
  //     withProgressBar: true
  //   });
  //   setExpectedAddressHasBeenCopied(true);
  // };
  // const handleActualAddressOnClickCopy = () => {
  //   toast.notify({
  //     text: t('general.clipboard.copiedToClipboard'),
  //     withProgressBar: true
  //   });
  //   setActualAddressHasBeenCopied(true);
  // };
  // const handleMouseLeaveExpectedAddress = () => {
  //   setExpectedAddressHasBeenCopied(false);
  // };
  // const handleMouseLeaveActualAddress = () => {
  //   setActualAddressHasBeenCopied(false);
  // };

  // const expectedAddressCopyText = expectedAddressHasBeenCopied ? 'general.button.copied' : 'general.button.copy';
  // const actualAddressCopyText = actualAddressHasBeenCopied ? 'general.button.copied' : 'general.button.copy';

  // const sendAnalytics = (analyticsName: string) => {
  //   analytics.sendEventToMatomo({
  //     category: MatomoEventCategories.ADDRESS_BOOK,
  //     action: MatomoEventActions.CLICK_EVENT,
  //     name: analyticsName
  //   });
  // };

  // const onHandleCancel = () => {
  //   // eslint-disable-next-line unicorn/no-null
  //   setSelectedSelectedId(null);
  //   if (action === 'delete') {
  //     sendAnalytics(
  //       popupView
  //         ? AnalyticsEventNames.AddressBook.CANCEL_DELETE_ADDRESS_POPUP
  //         : AnalyticsEventNames.AddressBook.CANCEL_DELETE_ADDRESS_BROWSER
  //     );
  //   } else {
  //     sendAnalytics(
  //       popupView
  //         ? AnalyticsEventNames.AddressBook.CANCEL_UPDATE_ADDRESS_POPUP
  //         : AnalyticsEventNames.AddressBook.CANCEL_UPDATE_ADDRESS_BROWSER
  //     );
  //   }
  // };

  // const onHandleConfirm = () => {
  //   // eslint-disable-next-line unicorn/no-null
  //   setSelectedSelectedId(null);
  //   if (action === 'delete') {
  //     sendAnalytics(
  //       popupView
  //         ? AnalyticsEventNames.AddressBook.CONFIRM_DELETE_UPDATE_ADDRESS_POPUP
  //         : AnalyticsEventNames.AddressBook.CONFIRM_DELETE_UPDATE_ADDRESS_BROWSER
  //     );
  //     onDelete(selectedId);
  //     onCancelClick();
  //   } else {
  //     sendAnalytics(
  //       popupView
  //         ? AnalyticsEventNames.AddressBook.CONFIRM_UPDATE_ADDRESS_POPUP
  //         : AnalyticsEventNames.AddressBook.CONFIRM_UPDATE_ADDRESS_BROWSER
  //     );
  //     onConfirmClick(initialValues);
  //     onCancelClick();
  //   }
  // };

  return (
    <>
      <Drawer
        zIndex={999}
        onClose={onCancelClick}
        className={cn(styles.drawer, { [styles.popupView]: popupView })}
        title={<DrawerHeader title={t('addressBook.reviewModal.title', { name: initialValues.name })} />}
        open={visible}
        navigation={
          <DrawerNavigation
            onCloseIconClick={!popupView ? onCancelClick : undefined}
            onArrowIconClick={popupView ? onCancelClick : undefined}
          />
        }
        afterOpenChange={(open) => setSection({ currentSection: open ? Sections.ADDRESS_CHANGE : Sections.FORM })}
        footer={<Footer isPopupView={popupView} onHandleChangeConfirm={onCancelClick} />}
        popupView={popupView}
      >
        <AddressChangeDetail
          isPopupView={popupView}
          name={initialValues.name}
          expectedAddress={expectedAddress}
          actualAddress={actualAddress}
        />
      </Drawer>
    </>
  );
};
