@SendTx-MultipleSelection-Popup @Testnet
Feature: Send - Multiple selection for Popup View

  Background:
    Given Wallet is synced

  @LW-5044
  Scenario Outline: Popup view - Send - Multiple tokens selection - happy path
    And I click "Send" button on Tokens page in popup mode
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 10 to the "tADA" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on the <assetsType> button in the coin selector dropdown
    And I click "Select multiple" button
    And I select amount: 30 of asset type: <assetsType>
    Then the 3 selected <assetsType> are grayed out and display checkmark
    And I see counter with number: 30 of selected tokens
    When I deselect <assetsType> 30
    Then the 2 selected <assetsType> are grayed out and display checkmark
    And I see counter with number: 29 of selected tokens
    When I save selected <assetsType> in bundle 1
    And I click "Add to transaction" button
    Then the selected assets are displayed in bundle 1
    Examples:
      | assetsType |
      | Tokens     |
      | NFTs       |

  @LW-5045
  Scenario Outline: Extended view - Send - Multiple tokens selection - clear and cancel
    And I click "Send" button on Tokens page in popup mode
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 10 to the "tADA" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on the <assetsType> button in the coin selector dropdown
    And I click "Select multiple" button
    Then I see "multipleSelection.cancel" button
    And I select amount: 5 of asset type: <assetsType>
    Then the 5 selected <assetsType> are grayed out and display checkmark
    And I see counter with number: 5 of selected tokens
    When I save selected <assetsType> in bundle 1
    And I click "Clear" button
    Then the 5 selected <assetsType> are not grayed out and display checkmark
    And I do not see counter with number: 5 of selected tokens
    And I see "multipleSelection.cancel" button
    When I click "Cancel" button
    Then I see "multipleSelection.selectMultiple" button
    When I close the drawer by clicking back button
    Then the selected assets are not displayed in bundle 1
    Examples:
      | assetsType |
      | Tokens     |
      | NFTs       |

  @LW-5268
  Scenario Outline: Extended view - Send - Multiple tokens selection - Maximum amount to select is 30
    And I click "Send" button on Tokens page in popup mode
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 10 to the "tADA" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on the <assetsType> button in the coin selector dropdown
    And I click "Select multiple" button
    And I select amount: 31 of asset type: <assetsType>
    Then the 30 selected <assetsType> are grayed out and display checkmark
    And <assetsType> 31 is not selected
    And I see counter with number: 30 of selected tokens
    When I save selected <assetsType> in bundle 1
    And I click "Add to transaction" button
    Then the selected assets are displayed in bundle 1
    Examples:
      | assetsType |
      | Tokens     |
      | NFTs       |
