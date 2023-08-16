@SendNftHdWallet-Extended-E2E @Testnet
Feature: Send NFT - Extended Browser View - E2E

  Background:
    Given Wallet is synced
    And I am on NFTs extended page
    And I'm in extended mode and select HD wallet that has NFT: "DEV 2280"

  @LW-7551
  Scenario: Extended-view - Send NFT HD wallets E2E
    And I'm sending an NFT with name: "DEV 2280" with HD wallet
    When I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with NFT name: "DEV 2280" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as sent for NFT with name: "DEV 2280" and wallet: "WalletReceiveNftHdWalletE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then I do not see NFT with name: "DEV 2280" on the NFTs page
    When I open NFT receiving HD wallet
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with NFT name: "DEV 2280" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as received for NFT with name: "DEV 2280" and wallet: "WalletSendNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then I see NFT with name: "DEV 2280" on the NFTs page

