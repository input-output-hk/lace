@SendTx-Simple-Extended
Feature: LW-484: Send & Receive - Extended Browser View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-3546 @Smoke @Testnet @Mainnet
  Scenario: Extended view - transaction drawer is displayed as specified
    When I click "Send" button on page header
    Then send drawer is displayed with all its components in extended mode

  @LW-2355 @LW-5034 @Testnet @Mainnet
  Scenario Outline: Extended-view - Enter valid <wallet> type address, no error displayed
    When I click "Send" button on page header
    And I enter a valid "<wallet>" address in the bundle 1 recipient's address
    Then "Incorrect address" error is not displayed under address input field
    And "Add address" button is enabled in the bundle 1 recipient's address input
    Examples:
      | wallet  |
      | byron   |
      | shelley |
      | icarus  |

  @LW-2356 @LW-5036 @Testnet @Mainnet
  Scenario: Extended-view - Enter Incorrect address - Wrong checksum - Error displayed & Review button is disabled
    When I click "Send" button on page header
    And I enter an address that matches the amount of characters but does not match with the checksum into address input 1
    Then "Incorrect address" error is displayed under address input field
    And "Review transaction" button is disabled on "Send" page
    And "Add address" button is disabled in the bundle 1 recipient's address input

  @LW-2357 @Testnet @Mainnet
  Scenario: Extended-view - Enter Incorrect address - Wrong amount of characters - Error displayed & Review button is disabled
    When I click "Send" button on page header
    And I enter more or less characters than the required for an address in the bundle recipient's address
    Then "Incorrect address" error is displayed under address input field
    And "Review transaction" button is disabled on "Send" page

  @LW-2358 @Testnet @Mainnet
  Scenario: Extended-view - Missing address - Review button is disabled
    When I click "Send" button on page header
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2359 @Testnet @Mainnet
  Scenario: Extended-view - Missing token value - Review button is disabled
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    Then "Review transaction" button is disabled on "Send" page

  @LW-2360 @Testnet @Mainnet
  Scenario: Extended-view - Review button is enabled when all required fields are filled
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2361 @Testnet @Mainnet
  Scenario: Extended-view - Address can be saved from Send screen
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click "Add address" button inside address input 1
    And I see "Add address" drawer in send flow in extended mode
    Then address form is filled with "shelley" address
    When I fill address form with "WalletName" name
    And I click "Save" button on "Add address" drawer in send flow
    And I see a toast with text: "Address added"
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    And I open address book from header menu
    Then I see address row with name "WalletName" and address "Shelley" on the list in extended mode

  @LW-2362 @Testnet
  Scenario: Extended-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button inside address input 1
    When I click address on the list with name "Shelley"
    Then recipients address input contains address "fwr6ja" and name "Shelley"
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2362 @Mainnet
  Scenario: Extended-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button inside address input 1
    When I click address on the list with name "Shelley"
    Then recipients address input contains address "2c767z" and name "Shelley"
    When I enter a value of: 1 to the "ADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2742 @Testnet @Mainnet
  Scenario: Extended-view - Send flow - Search contact
    Given I have several contacts whose start with the same characters
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    When I enter the first characters of the contacts
    Then a dropdown showing the first 5 matches is displayed

  @LW-2743 @Testnet @Mainnet
  Scenario: Extended-view - Send flow - Select contact from dropdown
    Given I have several contacts whose start with the same characters
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    When I enter the first characters of the contacts
    And click on one of the contacts on the dropdown
    Then the selected contact is added in the bundle recipient's address

  @LW-2363 @Testnet
  Scenario: Extended-view - Existing address can be selected from the address book and then removed
    And I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button inside address input 1
    When I click address on the list with name "Byron"
    Then recipients address input contains address "Nj7Dzp" and name "Byron"
    And click "Remove address" button inside address input 1
    Then recipients address input 1 is empty
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2363 @Mainnet
  Scenario: Extended-view - Existing address can be selected from the address book and then removed
    When I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button inside address input 1
    And I click address on the list with name "Byron"
    Then recipients address input contains address "FiPvM4" and name "Byron"
    And click "Remove address" button inside address input 1
    And recipients address input 1 is empty
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And "Review transaction" button is disabled on "Send" page

  @LW-2364 @Testnet @Mainnet
  Scenario: Extended-view - Cardano is set as a default token and Review button is disabled by default
    When I click "Send" button on page header
    Then the "tADA" asset is displayed in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2365 @Testnet @Mainnet
  Scenario: Extended-view - Coin selector contains Tokens/NFTs tabs
    When I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    Then coin selector contains two tabs: tokens & nfts

  @LW-2366 @Testnet
  Scenario: Extended-view - Switch token to another token
    When I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    And click on an token with name: "LaceCoin"
    Then the "LaceCoin1" asset is displayed in bundle 1
    And the balance of token is displayed in coin selector

  @LW-2366 @Mainnet
  Scenario: Extended-view - Switch token to another token
    When I click "Send" button on page header
    And click on the coin selector for "ADA" asset in bundle 1
    And click on an token with name: "SUNDAE"
    Then the "SUNDAE" asset is displayed in bundle 1
    And the balance of token is displayed in coin selector

  @LW-2367 @Testnet @Mainnet
  Scenario: Extended-view - Switch token to NFT
    When I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the "Ibilecoin" asset is displayed in bundle 1

  @LW-2368 @Testnet @Mainnet
  Scenario: Extended-view - Error displayed when token value out of range
    And I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I enter a value of: 99999999 to the "tADA" asset
    And I click on transaction drawer background to lose focus
    Then "Insufficient balance" error is displayed on "Send" page
    And "Review transaction" button is disabled on "Send" page
    When I enter a value of: 2 to the "tADA" asset
    Then "Insufficient balance" error is not displayed on "Send" page
    And "Review transaction" button is enabled on "Send" page

  @LW-2369 @Testnet @Mainnet
  Scenario: Extended-view - Transaction costs calculated
    When I click "Send" button on page header
    Then I verify transaction costs amount is around 0.00 ADA
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I enter a value of: 2 to the "tADA" asset
    Then I verify transaction costs amount is around 0.25 ADA

  @LW-2370 @Testnet @Mainnet
  Scenario: Extended-view - Tx summary page is displayed
    And I click "Send" button on page header
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

  @LW-3191 @Testnet @Mainnet
  Scenario: Extended-view - Tx summary page is displayed for Byron address minimum amount
    And I click "Send" button on page header
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

  @LW-2371 @Testnet @Mainnet
  Scenario: Extended-view - Password screen is displayed
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    Then The password screen is displayed:
      | Title: "Enter wallet" |
      | Input: Password       |
      | Button: "Confirm"     |
      | Button: "Cancel"      |

  @LW-2372 @Testnet @Mainnet
  Scenario: Extended-view - Password input can hide/show password
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I fill incorrect password
    Then Password field value is hidden
    When I click show password button
    Then Password field is displayed with value "somePassword"

  @LW-2373 @Smoke @Testnet @Mainnet
  Scenario: Extended-view - Password error page - after entering invalid Password
    And I click "Send" button on page header
    When I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    And I enter incorrect password and confirm the transaction
    Then I see "browserView.transaction.send.error.invalidPassword" password error

  @LW-2376 @Testnet @Mainnet
  Scenario: Extended-view - Cancel transaction on Send page
    And I click "Send" button on page header
    And Drawer is displayed
    When I close the drawer by clicking close button
    Then Drawer is not displayed
