import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReactComponent as EditIcon } from '../../../assets/icons/edit.component.svg';
import { DropDownMenu, DropDownMenuProps } from '../DropDownMenu';

describe('Testing WalletAddressItem component', () => {
  const props: DropDownMenuProps = {
    actions: [
      {
        text: 'Edit',
        icon: EditIcon,
        action: jest.fn()
      }
    ]
  };

  test('should render a dropdown menu', async () => {
    const { findByTestId } = render(<DropDownMenu {...props} />);
    const menu = await findByTestId('address-dropdown-menu');

    const menuItems = await within(menu).findAllByTestId('address-dropdown-menu-item');
    const firstItem = await within(menu).findByText(props.actions[0].text);

    expect(menuItems).toHaveLength(props.actions.length);
    expect(firstItem).toBeInTheDocument();
  });

  test('should fire event', async () => {
    const { findByTestId } = render(<DropDownMenu {...props} />);
    const menu = await findByTestId('address-dropdown-menu');

    const firstItem = await within(menu).findByText(props.actions[0].text);

    fireEvent.click(firstItem);

    expect(props.actions[0].action).toHaveBeenCalled();
  });
});
