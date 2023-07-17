@SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-2389 @Testnet @Mainnet
  Scenario Outline: Popup-view - Enter valid <wallet> type address, no error displayed
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "<wallet>" address in the bundle 1 recipient's address
    Then "Incorrect address" error is not displayed under address input field
    Examples:
      | wallet  |
      | byron   |
      | shelley |
      | icarus  |

  @LW-2390 @Testnet @Mainnet
  Scenario: Popup-view - Enter Incorrect address - Wrong checksum - Error displayed & Review button is disabled
    When I click "Send" button on Tokens page in popup mode
    And I enter an address  that matches the amount of characters but does not match with the checksum
    Then "Incorrect address" error is displayed under address input field
    And "Review transaction" button is disabled on "Send" page

  @LW-2391 @Testnet @Mainnet
  Scenario: Popup-view - Enter Incorrect address - Wrong amount of characters - Error displayed & Review button is disabled
    When I click "Send" button on Tokens page in popup mode
    And I enter more or less characters than the required for an address in the bundle recipient's address
    Then "Incorrect address" error is displayed under address input field
    And "Review transaction" button is disabled on "Send" page

  @LW-2392 @Testnet @Mainnet
  Scenario: Popup-view - Missing address - Review button is disabled
    When I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2393 @Testnet @Mainnet
  Scenario: Popup-view - Missing token value - Review button is disabled
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    Then "Review transaction" button is disabled on "Send" page

  @LW-2394 @Testnet @Mainnet
  Scenario: Popup-view - Review button is enabled when all required fields are filled
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2395 @Testnet @Mainnet
  Scenario: Popup-view - Address can be saved from Send screen
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click "Add address" button  in address bar
    And I see "Add address" drawer in send flow in popup mode
    Then address form is filled with "shelley" address
    When I fill address form with "WalletName" name
    And I click "Save" button on "Add address" drawer in send flow
    And I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I close the drawer by clicking back button
    And I click "Agree" button on "You'll have to start again" modal
    And I open address book from header menu
    Then I see address with name "WalletName" and address "shelley" on the list

  @LW-2740 @Testnet @Mainnet
  Scenario: Popup-view - Send flow - Search contact
    Given I have several contacts whose start with the same characters
    When I click "Send" button on Tokens page in popup mode
    And I enter the first characters of the contacts
    Then a dropdown showing the first 3 matches is displayed

  @LW-2741 @Testnet @Mainnet
  Scenario: Popup-view - Send flow - Select contact from dropdown
    Given I have several contacts whose start with the same characters
    When I click "Send" button on Tokens page in popup mode
    And I enter the first characters of the contacts
    And click on one of the contacts on the dropdown
    Then the selected contact is added in the bundle recipient's address

  @LW-2396 @Testnet
  Scenario: Popup-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button  in address bar
    When I click address on the list with name "Shelley"
    Then address input contains address "qfwr6ja" and name "Shelley"
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2396 @Mainnet
  Scenario: Popup-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button  in address bar
    When I click address on the list with name "Shelley"
    Then address input contains address "q2c767z" and name "Shelley"
    When I enter a value of: 1 to the "ADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2397 @Testnet
  Scenario: Popup-view - Existing address can be selected from the address book and then removed
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button  in address bar
    When I click address on the list with name "Byron"
    And address input contains address "oNj7Dzp" and name "Byron"
    And click "Remove address" button  in address bar
    Then address input  is empty
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2397 @Mainnet
  Scenario: Popup-view - Existing address can be selected from the address book and then removed
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button  in address bar
    When I click address on the list with name "Byron"
    And address input contains address "FiPvM4" and name "Byron"
    And click "Remove address" button  in address bar
    Then address input  is empty
    When I enter a value of: 1 to the "ADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2398 @Testnet @Mainnet
  Scenario: Popup-view - Cardano is set as a default token and Review button is disabled by default
    When I click "Send" button on Tokens page in popup mode
    Then the "tADA" asset is displayed in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2399 @Testnet @Mainnet
  Scenario: Popup-view - Coin selector contains Tokens/NFTs tabs
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    Then coin selector contains two tabs: tokens & nfts

  @LW-2400 @Testnet
  Scenario: Popup-view - Switch token to another token
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on an token with name: "LaceCoin"
    Then the "LaceC..." asset is displayed in bundle 1
    And the balance of token is displayed in coin selector

  @LW-2400 @Mainnet
  Scenario: Popup-view - Switch token to another token
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "ADA" asset in bundle 1
    And click on an token with name: "SUNDAE"
    Then the "SUNDA..." asset is displayed in bundle 1
    And the balance of token is displayed in coin selector

  @LW-2401 @Testnet @Mainnet
  Scenario: Popup-view - Switch token to NFT
    When I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the "Ibilecoin" asset is displayed in bundle 1

  @LW-2402 @Testnet @Mainnet
  Scenario: Popup-view - Error displayed when token value out of range
    And I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I enter a value of: 99999999 to the "tADA" asset in bundle 1
    And I click on transaction drawer background to lose focus
    Then "Insufficient balance" error is displayed on "Send" page
    And "Review transaction" button is disabled on "Send" page
    When I enter a value of: 2 to the "tADA" asset in bundle 1
    Then "Insufficient balance" error is not displayed on "Send" page
    Then "Review transaction" button is enabled on "Send" page

  @LW-2403 @Testnet @Mainnet
  Scenario: Popup-view - Transaction costs calculated
    When I click "Send" button on Tokens page in popup mode
    Then I verify transaction costs amount is around 0.00 ADA
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I enter a value of: 2 to the "tADA" asset in bundle 1
    Then I verify transaction costs amount is around 0.18 ADA

  @LW-2404 @Testnet @Mainnet
  Scenario: Popup-view - Tx summary page is displayed - single asset (ADA)
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen is displayed:
      | Title: "Transaction summary"         |
      | Subtitle: "Breakdown of your..."     |
      | Subtitle: "Recipient address"        |
      | Address: Recipient                   |
      | Subtitle: "Sending"                  |
      | Value: token to be sent (ADA + FIAT) |
      | Subtitle: "Transaction fee"          |
      | Value: Fee (ADA + FIAT)              |
      | Button: "Confirm"                    |
      | Button: "Cancel"                     |

  @LW-3396 @Testnet @Mainnet
  Scenario: Popup-view - Tx summary page for one bundle with multiple assets
    Given I click "Send" button on Tokens page in popup mode
    When I set 1 bundle with multiple assets
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen is displayed for 1 bundle with multiple assets

  @LW-3192 @Testnet @Mainnet
  Scenario: Popup-view - Tx summary page is displayed for Byron address minimum amount
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx for Byron with less than minimum value
    And I click "Review transaction" button on "Send" page
    Then The Tx summary screen is displayed for Byron with minimum value:
      | Title: "Transaction summary"         |
      | Subtitle: "Breakdown of your..."     |
      | Subtitle: "Recipient address"        |
      | Address: Recipient                   |
      | Subtitle: "Sending"                  |
      | Value: token to be sent (ADA + FIAT) |
      | Subtitle: "Transaction fee"          |
      | Value: Fee (ADA + FIAT)              |
      | Button: "Confirm"                    |
      | Button: "Cancel"                     |

  @LW-2405 @Testnet @Mainnet
  Scenario: Popup-view - Password screen is displayed
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    Then The password screen is displayed:
      | Title: "Enter wallet" |
      | Input: Password       |
      | Button: "Confirm"     |
      | Button: "Cancel"      |

  @LW-2406 @Testnet @Mainnet
  Scenario: Popup-view - Password input can hide/show password
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I fill incorrect password
    Then Password field value is hidden
    When I click show password button
    Then Password field is displayed with value "somePassword"

  @LW-2407 @Testnet @Mainnet
  Scenario: Popup-view - Password error page - after entering invalid Password
    And I click "Send" button on Tokens page in popup mode
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter incorrect password and confirm the transaction
    Then I see "browserView.transaction.send.error.invalidPassword" password error

  @LW-2410 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on Send page
    And I click "Send" button on Tokens page in popup mode
    And Drawer is displayed
    When I close the drawer by clicking back button
    Then Drawer is not displayed

  @LW-4583 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on coin selector - tokens not selected
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And I close the drawer by clicking back button
    Then the "tADA" asset is displayed in bundle 1
    And "Review transaction" button is disabled on "Send" page

  @LW-2411 @Testnet @Mainnet
  Scenario: Popup-view - Cancel transaction on Summary page
    And I click "Send" button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And Drawer is displayed
    When I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    Then Drawer is not displayed

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
    When I fill bundle 1 with "TestAutomationWallet" address with following assets:
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
    When I fill bundle 1 with "TestAutomationWallet" address with following assets:
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
    And I click on transaction drawer background to lose focus
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
    And I click MAX button in bundle 1 for "tADA" asset
    Then the maximum available amount is displayed in bundle: 1 for "tADA" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And I click MAX button in bundle 1 for "LaceCoin1" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin1" asset
    When I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin2"
    And I click MAX button in bundle 1 for "LaceCoin1" asset
    Then the maximum available amount is displayed in bundle: 1 for "LaceCoin1" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Ibilecoin" in asset selector
    And I click MAX button in bundle 1 for "Ibilecoin" asset
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin" in asset selector
    And I click MAX button in bundle 1 for "Bison Coin" asset
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
    And I click MAX button in bundle 1 for "Ibilecoin" asset
    Then the maximum available amount is displayed in bundle: 1 for "Ibilecoin" asset
    When I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I click on NFT with name: "Bison Coin" in asset selector
    And I click MAX button in bundle 1 for "Bison Coin" asset
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

  @LW-5146 @Testnet @Mainnet
  Scenario: Popup View - Send - Empty state in token selector - No search result for NFTs
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector

  @LW-5180 @Testnet
  Scenario Outline: Popup View - Send flow - Ticker displaying only 5 characters for <token> token
    And I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    When I save ticker for the Token with name: <token>
    And click on an token with name: "<token>"
    Then the displayed ticker for Tokens has the correct amount of characters
    When I hover over the ticker for "<token>" asset in bundle 1
    Then I see a tooltip showing full name: "<token>" for Tokens
    Examples:
      | token     |
      | tHOSKY    |
      | LaceCoin3 |
      | LaceCoin  |
      | LaceCoin2 |

  @LW-5181 @Testnet
  Scenario Outline: Popup View - Send flow - Ticker displaying only 5 characters for <nft> NFT
    And I click "Send" button on Tokens page in popup mode
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I save ticker for the NFT with name: <nft>
    And I click on NFT with name: "<nft>" in asset selector
    Then the displayed ticker for NFTs has the correct amount of characters
    When I hover over the ticker for "<nft>" asset in bundle 1
    Then I see a tooltip showing full name: "<nft>" for NFTs
    Examples:
      | nft                |
      | Bear020            |
      | Pixel NFT          |
      | Bored Ape          |
      | Single NFT Preprod |

  @LW-5183 @Testnet
  Scenario Outline: Popup View - Send flow - Values switched from <value> to <displayed_value> when building a transaction
    And I click "Send" button on Tokens page in popup mode
    When I enter a value of: <value_to_enter> to the "tADA" asset in bundle 1 without clearing input
    Then I see <displayed_value> as displayed value
    And I press keyboard Enter button
    Then the displayed value switches to: <conv_value>
    When I click on transaction drawer background to lose focus
    When I hover over the value for "tADA" asset in bundle 1
    Then I <should_see_tooltip> a tooltip showing full value: "<displayed_value>" for Tokens
    Examples:
      | value_to_enter    | displayed_value        | conv_value | should_see_tooltip |
      | 100               | 100                    | 100.00     | do not see         |
      | 987654            | 987,654                | 987,654.00 | do not see         |
      | 1000000           | 1,000,000              | 1.00M      | see                |
      | 1234567           | 1,234,567              | 1.23M      | see                |
      | 12345678          | 12,345,678             | 12.34M     | see                |
      | 123456789         | 123,456,789            | 123.45M    | see                |
      | 1234567891        | 1,234,567,891          | 1.23B      | see                |
      | 12345678912       | 12,345,678,912         | 12.34B     | see                |
      | 123456789123      | 123,456,789,123        | 123.45B    | see                |
      | 1234567891234     | 1,234,567,891,234      | 1.23T      | see                |
      | 12345678912345    | 12,345,678,912,345     | 12.34T     | see                |
      | 123456789123456   | 123,456,789,123,456    | 123.45T    | see                |
      | 1234567891234567  | 1,234,567,891,234,567  | 1.23Q      | see                |
      | 12345678912345678 | 12,345,678,912,345,678 | 12.34Q     | see                |

  @LW-4595 @Testnet
  Scenario: Popup view - Send - Different network address, mainnet address from testnet
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I enter a valid "mainnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-4595 @Mainnet
  Scenario: Popup view - Send - Different network address, testnet address from mainnet
    And I click "Send" button on Tokens page in popup mode
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And I enter a valid "testnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-3884 @Testnet @Mainnet
  Scenario: Extended View - Value can be altered from 1 when an NFT is added to a send transaction
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the "Ibilecoin" asset is displayed in bundle 1
    When I enter a value of: 1 to the "Ibilecoin" asset in bundle 1
    Then the NFT displays 1 in the value field
    And "Review transaction" button is enabled on "Send" page

  @LW-2408 @Testnet
  Scenario: Popup-view - Transaction error screen displayed on transaction submit error
    Given I enable network interception to fail request: "*/tx-submit/submit" with error 400
    And I click "Send" button on Tokens page in popup mode
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    When I enter correct password and confirm the transaction
    Then The Transaction error screen is displayed in popup mode
