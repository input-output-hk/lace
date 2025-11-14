@BitcoinWallet-Popup @Testnet

Feature: Bitcoin Wallet - Popup View

  @LW-12591
  Scenario: Popup View - Bitcoin Wallet - Create Bitcoin Wallet Using Mnemonics e2e
    When I click "Add New wallet" from user menu
    Then A new tab is opened with Lace in expanded view
    And I select "New wallet" option
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    When I copy and enter the mnemonics and confirm
    Then the wallet should be successfully imported
    And the correct Bitcoin address should be derived
    And the user should see new empty wallet

  @LW-12590
  Scenario: Popup View - Bitcoin Wallet - Import Bitcoin Wallet Using Mnemonics e2e
    When I click "Add New wallet" from user menu
    Then A new tab is opened with Lace in expanded view
    And I select "Restore wallet" option
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    When I enter the mnemonics and confirm the import
    Then the wallet should be successfully imported
    And the correct Bitcoin address should be derived
    And the user should see their Bitcoin balance and recent transactions
