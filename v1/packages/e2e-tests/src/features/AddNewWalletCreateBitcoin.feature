@AddNewWalletCreateBitcoin @Testnet @Mainnet
Feature: Add new wallet - Create Bitcoin wallet

  Background:
    Given Lace is ready for test

  @LW-13739 @Smoke
  Scenario: Extended-view - Multi-wallet - Create Bitcoin Wallet - Use same recovery phrase
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Create" flow for Bitcoin chain
    And "Recovery phrase" is selected as a recovery method for Bitcoin chain
    When I click "Next" button during wallet setup
    Then "Reuse your Recovery Phrase" page is displayed
    When I click "Reuse" button on "Reuse your Recovery Phrase" page
    Then "Confirm your password" page is displayed for wallet "MultiWallet2"
    When I enter valid password for wallet "MultiWallet2" on "Confirm your password" page
    And I click "Confirm" button on "Confirm your password" page
    Then "Wallet setup" page is displayed
    When I enter wallet name: "MultiWallet2", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I see LW homepage
    When I click "Receive" button on page header
    Then I see Bitcoin wallet name and address for wallet "MultiWallet2" in the Receive drawer

  @LW-13742
  Scenario: Extended-view - Multi-wallet - Create Bitcoin Wallet - Create new recovery phrase
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Create" flow for Bitcoin chain
    And "Recovery phrase" is selected as a recovery method for Bitcoin chain
    When I click "Next" button during wallet setup
    Then "Reuse your Recovery Phrase" page is displayed
    When I click "Skip" button on "Reuse your Recovery Phrase" page
    Then "Mnemonic writedown" page is displayed with 24 words
    When I save mnemonic words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    When I enter saved mnemonic words
    And I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    When I enter wallet name: "MultiWallet2", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I see LW homepage
    When I click "Receive" button on page header
    Then I see Bitcoin wallet name but no address for wallet "MultiWallet2" in the Receive drawer

  @LW-13746 @LW-13747
  Scenario: Extended-view - Multi-wallet - Create Bitcoin Wallet - Only 24 words allowed - Select another wallet
    Given I open wallet: "TwelveWordsMnemonic" in: extended mode
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Create" flow for Bitcoin chain
    And "Recovery phrase" is selected as a recovery method for Bitcoin chain
    When I click "Next" button during wallet setup
    Then "Reuse your Recovery Phrase" page is displayed
    When I click "Reuse" button on "Reuse your Recovery Phrase" page
    Then "Confirm your password" page is displayed for wallet "TwelveWordsMnemonic"
    When I enter valid password for wallet "TwelveWordsMnemonic" on "Confirm your password" page
    And I click "Confirm" button on "Confirm your password" page
    Then I see incompatible recovery phrase error page
    When I click "Select another wallet" button on incompatible recovery phrase error page
    Then "Reuse your Recovery Phrase" page is displayed

  @LW-13747
  Scenario: Extended-view - Multi-wallet - Create Bitcoin Wallet - Only 24 words allowed - Create new recovery phrase
    Given I open wallet: "TwelveWordsMnemonic" in: extended mode
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Create" flow for Bitcoin chain
    And "Recovery phrase" is selected as a recovery method for Bitcoin chain
    When I click "Next" button during wallet setup
    Then "Reuse your Recovery Phrase" page is displayed
    When I click "Reuse" button on "Reuse your Recovery Phrase" page
    Then "Confirm your password" page is displayed for wallet "TwelveWordsMnemonic"
    When I enter valid password for wallet "TwelveWordsMnemonic" on "Confirm your password" page
    And I click "Confirm" button on "Confirm your password" page
    Then I see incompatible recovery phrase error page
    When I click "Create a new one" button on incompatible recovery phrase error page
    Then "Mnemonic writedown" page is displayed with 24 words
    When I save mnemonic words
    And I click "Next" button during wallet setup
    Then "Mnemonic verification" page is displayed from "Create wallet" flow with 24 words
    When I enter saved mnemonic words
    And I click "Next" button during wallet setup
    Then "Wallet setup" page is displayed
    When I enter wallet name: "AddNewWallet", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I see LW homepage

  @LW-13743
  Scenario: Extended-view - Multi-wallet - Create Bitcoin Wallet - Use same recovery phrase - Invalid password
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    Then "Choose recovery method" page is displayed on "Create" flow for Bitcoin chain
    And "Recovery phrase" is selected as a recovery method for Bitcoin chain
    When I click "Next" button during wallet setup
    Then "Reuse your Recovery Phrase" page is displayed
    And "MultiWallet2" wallet name is selected on "Reuse your Recovery Phrase" page
    When I select "MultiWallet1" wallet name on "Reuse your Recovery Phrase" page
    Then "MultiWallet1" wallet name is selected on "Reuse your Recovery Phrase" page
    When I select "MultiWallet2" wallet name on "Reuse your Recovery Phrase" page
    Then "MultiWallet2" wallet name is selected on "Reuse your Recovery Phrase" page
    When I click "Reuse" button on "Reuse your Recovery Phrase" page
    Then "Confirm your password" page is displayed for wallet "MultiWallet2"
    When I enter invalid password for wallet "MultiWallet2" on "Confirm your password" page
    And I click "Confirm" button on "Confirm your password" page
    Then I see password error on "Confirm your password" page
    And "Confirm" button is disabled on "Confirm your password" page

  @LW-13741
  Scenario: Extended-view - Multi-wallet - Trying to reuse the same mnemonic
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    And I click "Next" button during wallet setup
    And I click "Reuse" button on "Reuse your Recovery Phrase" page
    And I enter valid password for wallet "MultiWallet2" on "Confirm your password" page
    And I click "Confirm" button on "Confirm your password" page
    And I enter wallet name: "MultiWallet2", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I see LW homepage
    When I click "Receive" button on page header
    Then I see Bitcoin wallet name and address for wallet "MultiWallet2" in the Receive drawer
    When I close the drawer by clicking close button
    And I opened "Create" flow via "Add new wallet" feature
    And I select "Bitcoin" blockchain on the "Select a blockchain" page
    And I click "Next" button during wallet setup
    And I click "Understood" button on "Bitcoin warning" modal
    And I click "Next" button during wallet setup
    And I click "Reuse" button on "Reuse your Recovery Phrase" page
    And I enter valid password for wallet "MultiWallet2" on "Confirm your password" page
    And I click "Confirm" button on "Confirm your password" page
    And I enter wallet name: "MultiWallet2", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Enter wallet" button
    Then I see LW homepage
    And I see a toast with text: "Wallet already exists"
    When I click "Receive" button on page header
    Then I see Bitcoin wallet name and address for wallet "MultiWallet2" in the Receive drawer
