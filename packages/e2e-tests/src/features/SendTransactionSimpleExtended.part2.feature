@SendTx-Simple-Extended
Feature: LW-484: Send & Receive - Extended Browser View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-4410 @Testnet @Mainnet
  Scenario: Extended-view - Cancel transaction on coin selector - tokens not selected
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And I close the drawer by clicking back button
    Then the "tADA" asset is displayed in bundle 1
    And "Review transaction" button is disabled on "Send" page

  @LW-2377 @Testnet @Mainnet
  Scenario: Extended-view - Cancel transaction on Summary page
    And I click "Send" button on page header
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-2378 @Testnet @Mainnet
  Scenario: Extended-view - Cancel transaction on Password page
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-1771 @Testnet @Mainnet
  Scenario: Exit modal - Cancel button - Empty fields
    And I click "Send" button on page header
    And all fields are empty
    When I click "Cancel" button on "Send" page
    Then Drawer is not displayed

  @LW-1776 @Testnet @Mainnet
  Scenario: Exit modal - Cancel button - Filled fields
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I click "Cancel" button on "Send" page
    Then a popup asking if you're sure you'd like to close it is displayed

  @LW-4001 @Testnet @Mainnet
  Scenario: Exit modal - Cancel button - Filled fields - Cancel closing
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I click "Cancel" button on "Send" page
    And a popup asking if you're sure you'd like to close it is displayed
    And I click "Cancel" button on "You'll have to start again" modal
    Then Drawer is displayed

  @LW-4002 @Testnet @Mainnet
  Scenario: Exit modal - Cancel button - Filled fields - Agree
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I click "Cancel" button on "Send" page
    And a popup asking if you're sure you'd like to close it is displayed
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-3552 @Testnet
  Scenario Outline: Extended View - Removing assets from Tx
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And click on the remove button for the "<assetName>" asset in bundle 1
    Then the "<assetName>" asset is not displayed in bundle 1
    Examples:
      | assetName |
      | LaceCoin1 |
      | tADA      |

  @LW-3552 @Mainnet
  Scenario Outline: Extended View - Removing assets from Tx
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And click on the remove button for the "<assetName>" asset in bundle 1
    Then the "<assetName>" asset is not displayed in bundle 1
    Examples:
      | assetName |
      | SUNDAE    |
      | ADA       |

  @LW-1761 @Testnet
  Scenario: Extended View - Unable to remove all assets from bundle
    And I click "Send" button on page header
    Then the "tADA" asset does not contain remove button in bundle 1
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And click on the remove button for the "LaceCoin1" asset in bundle 1
    Then the "LaceCoin1" asset is not displayed in bundle 1
    Then the "tADA" asset does not contain remove button in bundle 1

  @LW-1761 @Mainnet
  Scenario: Extended View - Unable to remove all assets from bundle
    And I click "Send" button on page header
    Then the "ADA" asset does not contain remove button in bundle 1
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And click on the remove button for the "SUNDAE" asset in bundle 1
    Then the "SUNDAE" asset is not displayed in bundle 1
    Then the "ADA" asset does not contain remove button in bundle 1

  @LW-3881 @Testnet @Mainnet
  Scenario: Extended View - Value defaults to 1 when an NFT is added to a send transaction
    Given I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the NFT displays 1 in the value field

  @LW-3558 @Testnet @Mainnet
  Scenario Outline: Extended View - Single <value> validation
    When I click "Send" button on page header
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    Then I enter a value of: <value>  to the "tADA" asset in bundle 1
    And I click on transaction drawer background to lose focus
    Then "Insufficient balance" error <should_see> displayed on "Send" page
    Then "Review transaction" button is <status> on "Send" page
    Examples:
      | value    | should_see | status   |
      | 2        | is not     | enabled  |
      | 99999999 | is         | disabled |

  @LW-1781 @Testnet @Mainnet
  Scenario: Extended View: Send - "Add asset" button becomes disabled once there are no assets to add
    When I click "Send" button on page header
    Then the 'Add asset' is enabled for bundle 1
    When I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    Then the 'Add asset' is disabled for bundle 1

  @LW-3744 @Testnet
  Scenario: Extended-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for "tADA" asset
    Then the maximum available amount is displayed in bundle: 1 for "tADA" asset

  @LW-4883 @Testnet @Mainnet
  Scenario: Extended-view - MAX button not displayed by default
    When I click "Send" button on page header
    Then the "MAX" button is not displayed

  @LW-4884 @Testnet @Mainnet
  Scenario: Extended-view - MAX button is displayed on hover when token value is 0
    And I click "Send" button on page header
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is displayed

  @LW-4885 @Testnet @Mainnet
  Scenario: Extended-view - MAX button is not displayed on hover when token value > 0
    And I click "Send" button on page header
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is not displayed

  @LW-4886 @Testnet @Mainnet
  Scenario: Extended-view - MAX button is not displayed on hover when max token value is set
    And I click "Send" button on page header
    And I click MAX button in bundle 1 for "tADA" asset
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is not displayed

  @LW-4762 @Testnet @Mainnet
  Scenario: Extended View - Send flow - Enter and Escape buttons support
    When I click "Send" button on page header
    And I press keyboard Enter button
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    When I press keyboard Enter button
    Then The Tx summary screen is displayed:
      | ignored |
    When I press keyboard Enter button
    Then The password screen is displayed:
      | ignored |
    When I press keyboard Escape button
    Then The Tx summary screen is displayed:
      | ignored |
    When I press keyboard Escape button
    Then send drawer is displayed with all its components in extended mode
    When I press keyboard Escape button
    Then a popup asking if you're sure you'd like to close it is displayed
    And I press keyboard Escape button
    Then send drawer is displayed with all its components in extended mode
    When I press keyboard Escape button
    Then a popup asking if you're sure you'd like to close it is displayed
    When I press keyboard Enter button
    Then Drawer is not displayed

  @LW-5141 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - All tokens have been selected
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I click "Add token or NFT" button for bundle 1
    Then "All gone! You've already selected everything" message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is not displayed inside asset selector

  @LW-5142 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - All NFTs have been selected
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available NFT types to bundle 1
    And I click "Add token or NFT" button for bundle 1
    Then "All gone! You've already selected everything" message is not displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is displayed inside asset selector

  @LW-5143 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - All tokens and NFTs have been selected
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    And click on the coin selector for "tADA" asset in bundle 1
    Then "All gone! You've already selected everything" message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is displayed inside asset selector
