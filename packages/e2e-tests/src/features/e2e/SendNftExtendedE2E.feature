@SendNft-Extended-E2E @Testnet
Feature: Send NFT - Extended Browser View - E2E

  Background:
    Given I am on NFTs extended page
    And Wallet is synced
    And I'm in extended mode and select wallet that has NFT: "Ibilecoin"

  @LW-2502 @Smoke
  Scenario: Extended-view - Send NFT E2E
    And I'm sending an NFT with name: "Ibilecoin"
    When I fill correct password and confirm
    Then The Transaction submitted screen is displayed:
      | Title: "All done"                            |
      | Subtitle: "The transaction will complete..." |
      | Text: transaction hash                       |
      | Button: "View transaction"                   |
      | Button: "Close"                              |
    When I close the drawer by clicking close button
    And I navigate to Transactions extended page
    Then the Sent transaction is displayed with NFT name: "Ibilecoin" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as sent for NFT with name: "Ibilecoin" and wallet: "WalletReceiveNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then the NFT with name: "Ibilecoin" is removed from gallery
    When I open NFT receiving wallet
    And Wallet is synced
    And I navigate to Transactions extended page
    Then the Received transaction is displayed with NFT name: "Ibilecoin" in extended mode
    When I click and open recent transactions details until find transaction with correct hash
    Then The Tx details are displayed as received for NFT with name: "Ibilecoin" and wallet: "WalletSendNftE2E" address
    When I close the drawer by clicking close button
    And I navigate to NFTs extended page
    Then the NFT with name: "Ibilecoin" is displayed in gallery

