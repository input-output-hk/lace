@AdaHandleSend @Testnet
Feature: ADA handle - extended view

  Background:
    Given I am on NFTs extended page
    And Wallet is synced
    And I use a single wallet with "$handletosend" NFT in extended mode

  @LW-7073
  Scenario: Extended view - Ada handle transfer e2e, review flow
    Given I validate that handle: "$handletosend" is listed on the Receive screen
    And I add address with name: "$handletosend" and address: "$handletosend" to address book in extended mode
    And I navigate to NFTs extended page
    And I'm sending the NFT with name: "$handletosend"
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
