@SendNft-Popup-E2E @Testnet
Feature: Send NFT - Popup View - E2E

  Background:
    Given I am on NFTs popup page
    And Wallet is synced
    And I use a single wallet with "Ibilecoin" NFT in popup mode

  @LW-2514
  Scenario: Popup-view - Send NFT E2E
    And I'm sending the NFT with name: "Ibilecoin"
    When I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in popup mode
    When I close the drawer by clicking close button
    And I navigate to Transactions popup page
    Then the Sent transaction is displayed with NFT name: "Ibilecoin" in popup mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as sent for NFT with name: "Ibilecoin" and wallet: "WalletReceiveNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs popup page
    Then I do not see NFT with name: "Ibilecoin" on the NFTs page
    When I open NFT receiving wallet
    And Wallet is synced
    And I navigate to Transactions popup page
    Then the Received transaction is displayed with NFT name: "Ibilecoin" in popup mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as received for NFT with name: "Ibilecoin" and wallet: "WalletSendNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs popup page
    Then I see NFT with name: "Ibilecoin" on the NFTs page

