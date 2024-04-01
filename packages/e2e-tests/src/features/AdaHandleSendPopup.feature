@AdaHandleSend-popup @Testnet
Feature: ADA handle - popup view

  Background:
    Given Wallet is synced
    And I am on NFTs popup page
    And I use a wallet with ADA handle "$handletosend2" NFT in popup mode

  @LW-8808 @Pending
  @issue=LW-8793
  @issue=LW-9885
  Scenario: Popup view - Ada handle transfer e2e, review flow
    Given I validate that handle: "$handletosend2" is listed on the Receive screen
    And I add address with name: "$handletosend2" and address: "$handletosend2" to address book in popup mode
    And I navigate to NFTs popup page
    And I'm sending the ADA handle with name: "$handletosend2" in popup mode
    And I enter correct password and confirm the transaction
    And The Transaction submitted screen is displayed in popup mode
    And I close the drawer by clicking close button
    And I navigate to Transactions popup page
    And the Sent transaction is displayed with handle name: "$handletosend2" in popup mode
    When I navigate to Address Book popup page
    Then I see warning for address row with name "$handletosend2"
    And I hover over the warning icon for "$handletosend2" handle
    Then I see handle warning tooltip
    And I click "Send" button on page header
    When I enter "$handletosend2" in the bundle 1 recipient's address
    Then I see review handle banner for handle: "$handletosend2"
    When I click "Review" button in review handle banner
    Then I see review handle drawer in popup mode for handle: "$handletosend2"
    And I click "Accept" button on review handle drawer
    And I see "Are you sure" review address modal
    And I click "Proceed" button on "Are you sure" review address modal
    And I see a toast with message: "Edited successfully"
    And I close the drawer by clicking close button
    And I click "Agree" button on "You'll have to start again" modal
    And I navigate to Address Book popup page
    And I see address row with name "$handletosend2" and address "$handletosend2" on the list in popup mode
    And I validate that handle: "$handletosend2" is not listed on the Receive screen
