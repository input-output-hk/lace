@Runner2 @SendNftHdWallet-Extended-E2E @E2E @Testnet
Feature: Send NFT HD wallets - Extended Browser View - E2E

  Background:
    Given Wallet is synced
    And I confirm multi-address discovery modal
    And I am on NFTs extended page
    And I use a HD wallet with "Bison Coin" NFT in extended mode

  @LW-7551
  Scenario: Extended-view - Send NFT HD wallets E2E
    And I'm sending the NFT with name: "Bison Coin" with HD wallet in extended mode
    When I enter correct password and confirm the transaction
    Then The Transaction submitted screen is displayed in extended mode
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with NFT name: "Bison Coin" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as sent for NFT with name: "Bison Coin" and wallet: "WalletReceiveNftHdWalletE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then I do not see NFT with name: "Bison Coin" on the NFTs page
    When I open NFT receiving HD wallet
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with NFT name: "Bison Coin" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as received for NFT with name: "Bison Coin" and wallet: "WalletSendNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then I see NFT with name: "Bison Coin" on the NFTs page

