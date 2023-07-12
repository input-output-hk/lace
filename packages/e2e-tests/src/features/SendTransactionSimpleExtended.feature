@SendTx-Simple-Extended
Feature: LW-484: Send & Receive - Extended Browser View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-3546 @Smoke @Testnet @Mainnet
  Scenario: Extended view - transaction drawer is displayed as specified
    When I click "Send" button on page header
    Then send drawer is displayed with all its components in extended mode

  @LW-2355 @Testnet @Mainnet
  Scenario Outline: Extended-view - Enter valid <wallet> type address, no error displayed
    When I click "Send" button on page header
    And I enter a valid "<wallet>" address in the bundle 1 recipient's address
    Then "Incorrect address" error is not displayed under address input field
    Examples:
      | wallet  |
      | byron   |
      | shelley |
      | icarus  |

  @LW-2356 @Testnet @Mainnet
  Scenario: Extended-view - Enter Incorrect address - Wrong checksum - Error displayed & Review button is disabled
    When I click "Send" button on page header
    And I enter an address  that matches the amount of characters but does not match with the checksum
    Then "Incorrect address" error is displayed under address input field
    And "Review transaction" button is disabled on "Send" page

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
    And click "Add address" button  in address bar
    And I see "Add address" drawer in send flow in extended mode
    Then address form is filled with "shelley" address
    When I fill address form with "WalletName" name
    And I click "Save" button on "Add address" drawer in send flow
    And I see a toast with message: "browserView.addressBook.toast.addAddress"
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    And I open address book from header menu
    Then I see address with name "WalletName" and address "shelley" on the list

  @LW-2362 @Testnet
  Scenario: Extended-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button  in address bar
    When I click address on the list with name "Shelley"
    Then address input contains address "qfwr6ja" and name "Shelley"
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is enabled on "Send" page

  @LW-2362 @Mainnet
  Scenario: Extended-view - Existing address can be selected from the address book and used for transaction
    And I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button  in address bar
    When I click address on the list with name "Shelley"
    Then address input contains address "q2c767z" and name "Shelley"
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
    And click "Add address" button  in address bar
    When I click address on the list with name "Byron"
    Then address input contains address "7oNj7Dzp" and name "Byron"
    And click "Remove address" button  in address bar
    Then address input  is empty
    When I enter a value of: 1 to the "tADA" asset in bundle 1
    Then "Review transaction" button is disabled on "Send" page

  @LW-2363 @Mainnet
  Scenario: Extended-view - Existing address can be selected from the address book and then removed
    When I have 3 addresses in my address book in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And click "Add address" button  in address bar
    And I click address on the list with name "Byron"
    Then address input contains address "kNFiPvM4" and name "Byron"
    And click "Remove address" button  in address bar
    And address input  is empty
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
    Then I verify transaction costs amount is around 0.18 ADA

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

  @LW-5147 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - No search result for tokens
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector

  @LW-5144 @Testnet @Mainnet
  Scenario: Extended View - Send - Empty state in token selector - No search result for NFTs
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I click "Add token or NFT" button for bundle 1
    And click on the NFTs button in the coin selector dropdown
    And I enter "random characters" in asset search input
    Then "No results matching your search" message is displayed inside asset selector

  @LW-1604 @Pending @Testnet
  #bug LW-5065
  Scenario: "Insufficient funds" error for extended view & advanced tx type for multiple assets
    And I save token: "Cardano" balance
    And I save token: "LaceCoin" balance
    And I save token: "LaceCoin2" balance
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And I enter a 110% of total "tADA" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin"
    And I enter a 110% of total "LaceCoin1" asset in bundle 1
    And I click "Add token or NFT" button for bundle 1
    And click on an token with name: "LaceCoin2"
    And I enter a 110% of total "LaceCoin2" asset in bundle 1
    Then I see insufficient balance error in bundle 1 for "tADA" asset
    And I see insufficient balance error in bundle 1 for "LaceCoin1" asset
    And I see insufficient balance error in bundle 1 for "LaceCoin2" asset
    And "Review transaction" button is disabled on "Send" page

  @LW-5184 @Testnet
  Scenario Outline: Extended View - Send flow - Values switched from <value> to <displayed_value> when building a transaction
    And I click "Send" button on page header
    And click on the coin selector for "tADA" asset in bundle 1
    And click on an token with name: "tHOSKY"
    When I enter a value of: <value_to_enter> to the "tHOSKY" asset in bundle 1 without clearing input
    Then I see <displayed_value> as displayed value
    And <action>
    Then the displayed value switches to: <conv_value>
    When I hover over the value for "tHOSKY" asset in bundle 1
    Then I <should_see_tooltip> a tooltip showing full value: "<displayed_value>" for Tokens
    Examples:
      | value_to_enter    | displayed_value        | conv_value | action                                  | should_see_tooltip |
      | 100               | 100                    | 100.00     | I click to loose focus from value field | do not see         |
      | 987654            | 987,654                | 987,654.00 | I press keyboard Enter button           | do not see         |
      | 1000000           | 1,000,000              | 1.00M      | I click to loose focus from value field | see                |
      | 1234567           | 1,234,567              | 1.23M      | I click to loose focus from value field | see                |
      | 12345678          | 12,345,678             | 12.34M     | I click to loose focus from value field | see                |
      | 123456789         | 123,456,789            | 123.45M    | I click to loose focus from value field | see                |
      | 1234567891        | 1,234,567,891          | 1.23B      | I click to loose focus from value field | see                |
      | 12345678912       | 12,345,678,912         | 12.34B     | I click to loose focus from value field | see                |
      | 123456789123      | 123,456,789,123        | 123.45B    | I click to loose focus from value field | see                |
      | 1234567891234     | 1,234,567,891,234      | 1.23T      | I click to loose focus from value field | see                |
      | 12345678912345    | 12,345,678,912,345     | 12.34T     | I click to loose focus from value field | see                |
      | 123456789123456   | 123,456,789,123,456    | 123.45T    | I click to loose focus from value field | see                |
      | 1234567891234567  | 1,234,567,891,234,567  | 1.23Q      | I click to loose focus from value field | see                |
      | 12345678912345678 | 12,345,678,912,345,678 | 12.34Q     | I click to loose focus from value field | see                |

  @LW-4595 @Testnet
  Scenario: Extended view - Send - Different network address, mainnet address from testnet
    And I click "Send" button on page header
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I enter a valid "mainnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-4595 @Mainnet
  Scenario: Extended view - Send - Different network address, testnet address from mainnet
    And I click "Send" button on page header
    And I enter a value of: 1 to the "ADA" asset in bundle 1
    And I enter a valid "testnetShelley" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    And "Review transaction" button is disabled on "Send" page

  @LW-4595 @Testnet
  Scenario Outline: Extended view - Send - Different network address, <network> from mainnet
    And I switch network to: "Mainnet" in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And I enter a valid "<network>" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    Examples:
      | network        |
      | testnetShelley |
      | testnetByron   |
      | testnetIcarus  |

  @LW-4595a @Mainnet
  Scenario Outline: Extended view - Send - Different network address, <network> from mainnet
    And I switch network to: "Preprod" in extended mode
    And I navigate to Tokens extended page
    And I click "Send" button on page header
    And I enter a valid "<network>" address in the bundle 1 recipient's address
    Then incorrect network address error banner is displayed
    Examples:
      | network        |
      | mainnetShelley |
      | mainnetByron   |
      | mainnetIcarus  |

  @LW-3883 @Testnet @Mainnet
  Scenario: Extended View - Value can be altered from 1 when an NFT is added to a send transaction
    When I click "Send" button on page header
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    And click on the coin selector for "tADA" asset in bundle 1
    And click on the NFTs button in the coin selector dropdown
    When I click on NFT with name: "Ibilecoin" in asset selector
    Then the "Ibilecoin" asset is displayed in bundle 1
    When I enter a value of: 1 to the "Ibilecoin" asset in bundle 1
    Then the NFT displays 1 in the value field
    And "Review transaction" button is enabled on "Send" page

  @LW-2374 @Testnet
  Scenario: Extended-view - Transaction error screen displayed on transaction submit error
    Given I enable network interception to fail request: "*/tx-submit/submit" with error 400
    And I click "Send" button on page header
    And I’ve entered accepted values for all fields of simple Tx
    And I click "Review transaction" button on "Send" page
    And I click "Confirm" button on "Transaction summary" page
    When I enter correct password and confirm the transaction
    Then The Transaction error screen is displayed in extended mode
