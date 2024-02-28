@SendNft-Extended-E2E @Testnet
Feature: Send NFT - Extended Browser View - E2E

  Background:
    Given Wallet is synced
    And I am on NFTs extended page
    And I use a single wallet with "Ibilecoin" NFT in extended mode

  @LW-2502 @Smoke
  Scenario: Extended-view - Send NFT E2E
    And I'm sending the NFT with name: "Ibilecoin" in extended mode
    When I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with NFT name: "Ibilecoin" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as sent for NFT with name: "Ibilecoin" and wallet: "WalletReceiveNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then I do not see NFT with name: "Ibilecoin" on the NFTs page
    When I open NFT receiving wallet in extended mode
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with NFT name: "Ibilecoin" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as received for NFT with name: "Ibilecoin" and wallet: "WalletSendNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then I see NFT with name: "Ibilecoin" on the NFTs page

