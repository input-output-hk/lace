@AdaHandleSend-extended @Testnet
Feature: ADA handle - extended view

  Background:
    Given Wallet is synced
    And I am on NFTs extended page
    And Address book is empty
    And I use a wallet with ADA handle "$handletosend" NFT in extended mode

  @LW-7073
  @Pending @issue=LW-10445
  Scenario: Extended view - Ada handle transfer e2e, review flow
    Given I validate that handle: "$handletosend" is listed on the Receive screen
    And I add address with name: "$handletosend" and address: "$handletosend" to address book in extended mode
    And I navigate to NFTs extended page
    And I'm sending the ADA handle with name: "$handletosend" in extended mode
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in extended mode
    And I close the drawer by clicking close button
    And I navigate to Transactions extended page
    And the Sent transaction is displayed with handle name: "$handletosend" in extended mode
    When I navigate to Address Book extended page
    Then I see warning for address row with name "$handletosend"
    And I hover over the warning icon for "$handletosend" handle
    Then I see handle warning tooltip
    And I click "Send" button on page header
    When I enter "$handletosend" in the bundle 1 recipient's address
    Then I see review handle banner for handle: "$handletosend"
    When I click "Review" button in review handle banner
    Then I see review handle drawer in extended mode for handle: "$handletosend"
    And I click "Accept" button on review handle drawer
    And I see "Are you sure" review address modal
    And I click "Proceed" button on "Are you sure" review address modal
    And I see a toast with text: "Edited successfully"
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    And I navigate to Address Book extended page
    And I see address row with name "$handletosend" and address "$handletosend" on the list in extended mode
    And I validate that handle: "$handletosend" is not listed on the Receive screen

  @LW-9106
  Scenario: Extended view - test for bug LW-9082 - scenario 1
    When I click "Send" button on page header
    And I click "Add bundle" button on "Send" page
    And I remove bundle 1
    Then I see 1 bundle rows
    And the "tADA" asset is displayed in bundle 1

  @LW-9107
  Scenario: Extended view - test for bug LW-9082 - scenario 2
    When I click "Send" button on page header
    And I enter a value of: 1 to the "tADA" asset in bundle 1
    And I click "Add bundle" button on "Send" page
    And click on the coin selector for "tADA" asset in bundle 2
    And click on an token with name: "LaceCoin"
    And I enter a value of: 1 to the "LaceCoin" asset in bundle 2
    And I remove bundle 2
    Then I see 1 bundle rows
    And the "tADA" asset is displayed in bundle 1
