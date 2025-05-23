@SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-3396 @Testnet @Mainnet
  Scenario: Popup-view - Tx summary page for one bundle with multiple assets
    Given I click 'Send' button on Tokens page in popup mode
    When I set 1 bundle with multiple assets
    And I click 'Review transaction' button on 'Send' page
    Then The Tx summary screen is displayed for 1 bundle with multiple assets

  @LW-3192 @Testnet @Mainnet
  Scenario: Popup-view - Tx summary page is displayed for Byron address minimum amount
    And I click 'Send' button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx for Byron with less than minimum value
    And I click 'Review transaction' button on 'Send' page
    Then The Tx summary screen is displayed for Byron with minimum value:
      | Title: 'Transaction summary'         |
      | Subtitle: 'Breakdown of your...'     |
      | Subtitle: 'Recipient address'        |
      | Address: Recipient                   |
      | Subtitle: 'Sending'                  |
      | Value: token to be sent (ADA + FIAT) |
      | Subtitle: 'Transaction fee'          |
      | Value: Fee (ADA + FIAT)              |
      | Button: 'Confirm'                    |
      | Button: 'Cancel'                     |

  @LW-2405 @Testnet @Mainnet
  Scenario: Popup-view - Password screen is displayed
    And I click 'Send' button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    Then The password screen is displayed:
      | Title: 'Enter wallet' |
      | Input: Password       |
      | Button: 'Confirm'     |
      | Button: 'Cancel'      |

  @LW-2406 @Testnet @Mainnet
  Scenario: Popup-view - Password input can hide/show password
    And I click 'Send' button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    And I fill incorrect password
    Then Password field value is hidden
    When I click show password button
    Then Password field is displayed with value 'somePassword'

  @LW-2407 @Testnet @Mainnet
  Scenario: Popup-view - Password error page - after entering invalid Password
    And I click 'Send' button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    And I enter incorrect password and confirm the transaction
    Then I see 'browserView.transaction.send.error.invalidPassword' password error

  @LW-2410 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on Send page
    And I click 'Send' button on Tokens page in popup mode
    And Drawer is displayed
    When I close the drawer by clicking back button
    Then Drawer is not displayed

  @LW-4583 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on coin selector - tokens not selected
    When I click 'Send' button on Tokens page in popup mode
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And I close the drawer by clicking back button
    Then the 'tADA' asset is displayed in bundle 1
    And 'Review transaction' button is disabled on 'Send' page

  @LW-2411 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on Summary page
    And I click 'Send' button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    And I click 'Review transaction' button on 'Send' page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click 'Agree' button on 'You'll have to start again' modal
    Then Drawer is not displayed

  @LW-2412 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on Password page
    And I click 'Send' button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click 'Agree' button on 'You'll have to start again' modal
    Then Drawer is not displayed

  @LW-3581 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction with multiple assets on Summary page
    Given I click 'Send' button on Tokens page in popup mode
    When I set 1 bundle with multiple assets
    And I click 'Review transaction' button on 'Send' page
    And Drawer is displayed
    And I close the drawer by clicking close button
    And I click 'Agree' button on 'You'll have to start again' modal
    Then Drawer is not displayed

  @LW-3581 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction with multiple assets on Password page
    Given I click 'Send' button on Tokens page in popup mode
    When I set 1 bundle with multiple assets
    And I click 'Review transaction' button on 'Send' page
    And I click 'Confirm' button on 'Transaction summary' page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click 'Agree' button on 'You'll have to start again' modal
    Then Drawer is not displayed

  @LW-2388 @Testnet @Mainnet
  Scenario: Popup-view - Click 'Add bundle' button and open extended view
    And I click 'Send' button on Tokens page in popup mode
    When I click 'Add bundle' button on 'Send' page
    And I switch to last window
    Then Drawer is displayed

  @LW-3395 @LW-5061 @Testnet
  Scenario: Popup-view - Click 'Add bundle' button and open extended view - tokens saved
    And I click 'Send' button on Tokens page in popup mode
    When I fill bundle 1 with 'TestAutomationWallet' main address with following assets:
      | type  | assetName | amount | ticker    |
      | ADA   | Cardano   | 3      | tADA      |
      | Token | LaceCoin3 | 0.45   | LaceCoin3 |
      | NFT   | Ibilecoin | 1      |           |
    And I click 'Add bundle' button on 'Send' page
    And I switch to last window
    Then Drawer is displayed
    And bundle 1 contains following assets:
      | name      | amount |
      | tADA      | 3      |
      | LaceCoin3 | 0.45   |
      | Ibilecoin | 1      |

  @LW-3395 @LW-5061 @Mainnet
  Scenario: Popup-view - Click 'Add bundle' button and open extended view - tokens saved
    And I click 'Send' button on Tokens page in popup mode
    When I fill bundle 1 with 'TestAutomationWallet' main address with following assets:
      | type  | assetName | amount | ticker |
      | ADA   | Cardano   | 2      | ADA    |
      | Token | SUNDAE    | 0.45   | SUNDAE |
      | NFT   | Ibilecoin | 1      |        |
    And I click 'Add bundle' button on 'Send' page
    And I switch to last window
    Then Drawer is displayed
    And bundle 1 contains following assets:
      | name      | amount |
      | ADA       | 2      |
      | SUNDAE    | 0.45   |
      | Ibilecoin | 1      |


  @LW-3553 @Testnet
  Scenario Outline: Popup View - Removing assets from Tx - <assetName>
    And I click 'Send' button on Tokens page in popup mode
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin'
    And click on the remove button for the '<assetName>' asset in bundle 1
    Then the '<assetName>' asset is not displayed in bundle 1
    Examples:
      | assetName |
      | LaceCoin1 |
      | tADA      |

  @LW-3553 @Mainnet
  Scenario Outline: Popup View - Removing assets from Tx - <assetName>
    And I click 'Send' button on Tokens page in popup mode
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'SUNDAE'
    And click on the remove button for the '<assetName>' asset in bundle 1
    Then the '<assetName>' asset is not displayed in bundle 1
    Examples:
      | assetName |
      | SUNDAE    |
      | ADA       |

  @LW-4938 @Testnet
  Scenario: Popup View - Unable to remove all assets from bundle
    And I click 'Send' button on Tokens page in popup mode
    And the 'tADA' asset does not contain remove button in bundle 1
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'LaceCoin'
    When click on the remove button for the 'LaceCoin1' asset in bundle 1
    Then the 'tADA' asset does not contain remove button in bundle 1

  @LW-4938 @Mainnet
  Scenario: Popup View - Unable to remove all assets from bundle
    And I click 'Send' button on Tokens page in popup mode
    And the 'ADA' asset does not contain remove button in bundle 1
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And click on an token with name: 'SUNDAE'
    When click on the remove button for the 'SUNDAE' asset in bundle 1
    Then the 'ADA' asset does not contain remove button in bundle 1

  @LW-3882 @Testnet @Mainnet
  Scenario: Popup View - Value defaults to 1 when an NFT is added to a send transaction
    When I click 'Send' button on Tokens page in popup mode
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And click on the coin selector for 'tADA' asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: 'Ibilecoin'
    Then I see 1 as displayed value

  @LW-3559 @Testnet @Mainnet
  Scenario Outline: Popup View - Single <value> validation
    When I click 'Send' button on Tokens page in popup mode
    When I enter a valid 'shelley' address in the bundle 1 recipient's address
    Then I enter a value of: <value>  to the 'tADA' asset in bundle 1
    And I open cancel modal to trigger button validation
    Then 'Insufficient balance' error <should_see> displayed on 'Send' page
    And 'Review transaction' button is <status> on 'Send' page
    Examples:
      | value    | should_see | status   |
      | 2        | is not     | enabled  |
      | 99999999 | is         | disabled |

  @LW-3099 @Testnet @Mainnet
  Scenario: Popup view - Clicking back on coin selector without selecting any coins
    When I click 'Send' button on Tokens page in popup mode
    And I enter a valid 'shelley' address in the bundle 1 recipient's address
    And I click 'Add token or NFT' button for bundle 1
    And I close the drawer by clicking back button
    Then the 'tADA' asset is displayed in bundle 1
