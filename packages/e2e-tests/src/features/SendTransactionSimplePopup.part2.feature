@SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-2412 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on Password page
    And I click "Send" button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-3581 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction with multiple assets on Summary page
    Given I click "Send" button on Tokens page in popup mode
    When I set 1 bundle with multiple assets
    And I click "Review transaction" button on "Send" page
    And Drawer is displayed
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-3581 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction with multiple assets on Password page
    Given I click "Send" button on Tokens page in popup mode
    When I set 1 bundle with multiple assets
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

  @LW-2388 @Testnet @Mainnet
  Scenario: Popup-view - Click "Add bundle" button and open extended view
    And I click "Send" button on Tokens page in popup mode
    When I click "Add bundle" button on "Send" page
    And I switch to last window
    Then Drawer is displayed

  @LW-3395 @LW-5061 @Testnet
  Scenario: Popup-view - Click "Add bundle" button and open extended view - tokens saved
    And I click "Send" button on Tokens page in popup mode
    When I fill bundle 1 with "TestAutomationWallet" main address with following assets:
      | type  | assetName | amount | ticker    |
      | ADA   | Cardano   | 3      | tADA      |
      | Token | LaceCoin3 | 0.45   | LaceCoin3 |
      | NFT   | Ibilecoin | 1      |           |
    And I click "Add bundle" button on "Send" page
    And I switch to last window
    Then Drawer is displayed
    And bundle 1 contains following assets:
      | name      | amount |
      | tADA      | 3      |
      | LaceCoin3 | 0.45   |
      | Ibilecoin | 1      |

  @LW-3395 @LW-5061 @Mainnet
  Scenario: Popup-view - Click "Add bundle" button and open extended view - tokens saved
    And I click "Send" button on Tokens page in popup mode
    When I fill bundle 1 with "TestAutomationWallet" main address with following assets:
      | type  | assetName | amount | ticker |
      | ADA   | Cardano   | 2      | ADA    |
      | Token | SUNDAE    | 0.45   | SUNDAE |
      | NFT   | Ibilecoin | 1      |        |
    And I click "Add bundle" button on "Send" page
    And I switch to last window
    Then Drawer is displayed
    And bundle 1 contains following assets:
      | name      | amount |
      | ADA       | 2      |
      | SUNDAE    | 0.45   |
      | Ibilecoin | 1      |


  @LW-3553 @Testnet
  Scenario Outline: Popup View - Removing assets from Tx
    And I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And click on the remove button for the "<assetName>" asset in bundle 1
    Then the "<assetName>" asset is not displayed in bundle 1
    Examples:
      | assetName |
      | LaceCoin1 |
      | tADA      |

  @LW-3553 @Mainnet
  Scenario Outline: Popup View - Removing assets from Tx
    And I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And click on the remove button for the "<assetName>" asset in bundle 1
    Then the "<assetName>" asset is not displayed in bundle 1
    Examples:
      | assetName |
      | SUNDAE    |
      | ADA       |

  @LW-4938 @Testnet
  Scenario: Popup View - Unable to remove all assets from bundle
    And I click "Send" button on Tokens page in popup mode
    And the "tADA" asset does not contain remove button in bundle 1
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    When click on the remove button for the "LaceCoin1" asset in bundle 1
    Then the "tADA" asset does not contain remove button in bundle 1

  @LW-4938 @Mainnet
  Scenario: Popup View - Unable to remove all assets from bundle
    And I click "Send" button on Tokens page in popup mode
    And the "ADA" asset does not contain remove button in bundle 1
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    When click on the remove button for the "SUNDAE" asset in bundle 1
    Then the "ADA" asset does not contain remove button in bundle 1

  @LW-3882 @Testnet @Mainnet
  Scenario: Popup View - Value defaults to 1 when an NFT is added to a send transaction
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the NFT displays 1 in the value field

  @LW-3559 @Testnet @Mainnet
  Scenario Outline: Popup View - Single <value> validation
    When I click "Send" button on Tokens page in popup mode
    When I enter a valid "shelley" address in the bundle 1 recipient's address
    Then I enter a value of: <value>  to the "tADA" asset in bundle 1
    And I open cancel modal to trigger button validation
    Then "Insufficient balance" error <should_see> displayed on "Send" page
    And "Review transaction" button is <status> on "Send" page
    Examples:
      | value    | should_see | status   |
      | 2        | is not     | enabled  |
      | 99999999 | is         | disabled |

  @LW-3099 @Testnet @Mainnet
  Scenario: Popup view - Clicking back on coin selector without selecting any coins
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And I close the drawer by clicking back button
    Then the "tADA" asset is displayed in bundle 1

  @LW-4705 @Testnet @Mainnet
  Scenario: Popup View: Send - "Add asset" button becomes disabled once there are no assets to add
    When I click "Send" button on Tokens page in popup mode
    Then the 'Add asset' is enabled for bundle 1
    When I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    Then the 'Add asset' is disabled for bundle 1

  @LW-4648 @Testnet @Mainnet
  Scenario: Popup view - transaction drawer is displayed as specified
    When I click "Send" button on Tokens page in popup mode
    Then send drawer is displayed with all its components in popup mode

  @LW-3745 @Testnet
  Scenario: Popup-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for "tADA" asset
    Then the maximum available amount is displayed in bundle: 1 for "tADA" asset

  @LW-4736 @Testnet
  Scenario: Popup-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And I click MAX button in bundle 1 for "LaceCoin1" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin1" asset

  @LW-4736 @Mainnet
  Scenario: Popup-view - send maximum amount of a token available in the wallet by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "HOSKY Token"
    And I click MAX button in bundle 1 for "HOSKY" asset
    Then the maximum available amount is displayed in bundle: 1 for "HOSKY" asset

  @LW-4737 @Testnet
  Scenario: Popup-view - send maximum amount of multiple assets by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
#    disabled until "utxo fully depleted" error is fixed for MAX tADA
#    And I click MAX button in bundle 1 for "tADA" asset
#    Then the maximum available amount is displayed in bundle: 1 for "tADA" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And I click MAX button in bundle 1 for "LaceCoin1" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin1" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin2"
    And I click MAX button in bundle 1 for "LaceCoin2" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin2" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin" in asset selector
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin" in asset selector
    Then the maximum available amount is displayed in bundle: 1 for "Bison Coin" asset
    And "Review transaction" button is enabled on "Send" page

  @LW-4737 @Mainnet
  Scenario: Popup-view - send maximum amount of multiple assets by clicking MAX button
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click MAX button in bundle 1 for "tADA" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "HOSKY Token"
    And I click MAX button in bundle 1 for "HOSKY" asset
    Then the maximum available amount is displayed in bundle: 1 for "HOSKY" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "SUNDAE"
    And I click MAX button in bundle 1 for "SUNDAE" asset
    Then the maximum available amount is displayed in bundle: 1 for "SUNDAE" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin" in asset selector
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin" in asset selector
    Then the maximum available amount is displayed in bundle: 1 for "Bison Coin" asset
    And "Review transaction" button is enabled on "Send" page

  @LW-4887 @Testnet @Mainnet
  Scenario: Popup-view - MAX button not displayed by default
    When I click "Send" button on Tokens page in popup mode
    Then the "MAX" button is not displayed

  @LW-4888 @Testnet @Mainnet
  Scenario: Popup-view - MAX button is displayed on hover when token value is 0
    And I click "Send" button on Tokens page in popup mode
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is displayed

  @LW-4889 @Testnet @Mainnet
  Scenario: Popup-view - MAX button is not displayed on hover when token value > 0
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is not displayed

  @LW-4890 @Testnet @Mainnet
  Scenario: Popup-view - MAX button is not displayed on hover when max token value is set
    And I click "Send" button on Tokens page in popup mode
    And I click MAX button in bundle 1 for "tADA" asset
    When I hover over the value for "tADA" asset in bundle 1
    Then the "MAX" button is not displayed

  @LW-5148 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - All tokens have been selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I click "Add token or NFT" button for bundle 1
    Then "All gone! You've already selected everything" message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is not displayed inside asset selector

  @LW-5149 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - All NFTs have been selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available NFT types to bundle 1
    And I click "Add token or NFT" button for bundle 1
    Then "All gone! You've already selected everything" message is not displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is displayed inside asset selector

  @LW-5150 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - All tokens and NFTs have been selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I add all available token types to bundle 1
    And I add all available NFT types to bundle 1
    And click on the coin selector for "tADA" asset in bundle 1
    Then "All gone! You've already selected everything" message is displayed inside asset selector
    When click on the NFTs button in the coin selector dropdown
    Then "All gone! You've already selected everything" message is displayed inside asset selector

  @LW-5145 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - No search result for tokens
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector
