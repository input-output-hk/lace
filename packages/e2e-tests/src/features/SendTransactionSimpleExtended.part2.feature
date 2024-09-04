@SendTx-Simple-Extended
Feature: LW-484: Send & Receive - Extended Browser View (Simple Tx)

  Background:
    Given Wallet is synced

  @LW-2369 @Testnet @Mainnet
  Scenario: Extended-view - Transaction costs calculated
    When I click "Send" button on page header
    Then I verify transaction costs amount is around 0.00 ADA
    And I enter a valid "shelley" address in the bundle 1 recipient's address
    When I enter a value of: 2 to the "tADA" asset
    Then I verify transaction costs amount is around 0.17 ADA

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
  Scenario Outline: Extended View - Removing assets from Tx - <assetName>
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
  Scenario Outline: Extended View - Removing assets from Tx - <assetName>
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
    Then I see 1 as displayed value
