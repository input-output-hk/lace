@Runner1 @SendTx-Simple-Popup
Feature: LW-484: Send & Receive - Popup View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-2389 @LW-5035 @Testnet @Mainnet
  Scenario Outline: Popup-view - Enter valid <wallet> type address, no error displayed
    When I click "Send" button on Tokens page in popup mode
    And I enter a valid "<wallet>" address in the bundle 1 recipient's address
    Then "Incorrect address" error is not displayed under address input field
    And "Add address" button is enabled in the bundle 1 recipient's address input
    Examples:
      | wallet  |
      | byron   |
      | shelley |
      | icarus  |

  @LW-2390 @LW-5037 @Testnet @Mainnet
  Scenario: Popup-view - Enter Incorrect address - Wrong checksum - Error displayed & Review button is disabled
    When I click "Send" button on Tokens page in popup mode
    And I enter an address that matches the amount of characters but does not match with the checksum into address input 1
    Then "Incorrect address" error is displayed under address input field
    And "Review transaction" button is disabled on "Send" page
    And "Add address" button is disabled in the bundle 1 recipient's address input

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
    And click "Add address" button inside address input 1
    And I see "Add address" drawer in send flow in popup mode
    Then address form is filled with "shelley" address
    When I fill address form with "WalletName" name
    And I click "Save" button on "Add address" drawer in send flow
    And I see a toast with text: "Address added"
    And I close the drawer by clicking back button
    And I click "Agree" button on "You'll have to start again" modal
    And I open address book from header menu
    Then I see address row with name "WalletName" and address "Shelley" on the list in popup mode

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
    And click "Add address" button inside address input 1
    When I click address on the list with name "Shelley"
    Then recipients address input contains address "fwr6ja" and name "Shelley"
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2396 @Mainnet
  Scenario: Popup-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button inside address input 1
    When I click address on the list with name "Shelley"
    Then recipients address input contains address "2c767z" and name "Shelley"
    When I enter a value of: 1 to the "ADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2397 @Testnet
  Scenario: Popup-view - Existing address can be selected from the address book and then removed
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button inside address input 1
    When I click address on the list with name "Byron"
    And recipients address input contains address "Nj7Dzp" and name "Byron"
    And click "Remove address" button inside address input 1
    Then recipients address input 1 is empty
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2397 @Mainnet
  Scenario: Popup-view - Existing address can be selected from the address book and then removed
    And I have 3 addresses in my address book in popup mode
    And I navigate to Tokens popup page
    And I click "Send" button on Tokens page in popup mode
    And click "Add address" button inside address input 1
    When I click address on the list with name "Byron"
    And recipients address input contains address "iPvM4" and name "Byron"
    And click "Remove address" button inside address input 1
    Then recipients address input 1 is empty
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
    And I open cancel modal to trigger button validation
    Then "Insufficient balance" error is displayed on "Send" page
    And "Review transaction" button is disabled on "Send" page
    When I enter a value of: 2 to the "tADA" asset in bundle 1
    And I open cancel modal to trigger button validation
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
