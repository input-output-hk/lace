@WalletRenaming-Popup @Testnet
Feature: Wallet renaming

  Background:
    Given Wallet is synced

  @LW-12277
  Scenario: Popup view - rename wallet - save
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    Then "Wallet settings" drawer is displayed in popup mode
    When I enter "Renamed wallet" as a new wallet name
    And I click on "Save" button on "Wallet settings" page
    Then I see a toast with text: "Wallet renamed successfully"
    When I close a toast message
    Then Wallet number 1 with "Renamed wall..." name is displayed on the user menu
    And "Renamed wa..." is displayed as a wallet name on the menu button
    When I close header menu
    And I click "Receive" button on Tokens page in popup mode
    Then I see "Renamed wallet" name on main address card

  @LW-12279
  Scenario: Popup view - rename wallet - cancel
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    Then "Wallet settings" drawer is displayed in popup mode
    When I click on "Cancel" button on "Wallet settings" page
    Then I don't see a toast with text: "Wallet renamed successfully"
    And Wallet number 1 with "TestAutomati..." name is displayed on the user menu
    And "TestAutoma..." is displayed as a wallet name on the menu button
    When I close header menu
    And I click "Receive" button on Tokens page in popup mode
    Then I see "TestAutomationWallet" name on main address card

  @LW-12281
  Scenario: Popup view - rename wallet - too long name
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "012345678901234567890" as a new wallet name
    Then Wallet name error "Max 20 characters" is displayed
    And "Save" button in disabled on "Wallet settings" page

  @LW-12298
  Scenario: Popup view - rename wallet - name cannot be empty
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "" as a new wallet name
    Then Wallet name error "Name cannot be empty" is displayed
    And "Save" button in disabled on "Wallet settings" page

  @LW-12287
  Scenario: Popup view - rename account - save
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "Renamed account" as a new account name for account #0
    And I click on "Save" button on "Wallet settings" page
    Then I see a toast with text: "Wallet renamed successfully"
    When I close a toast message
    Then Wallet number 1 with "Renamed acco..." account name is displayed on the user menu
    And "Renamed ac..." is displayed as an account name on the menu button

  @LW-12289
  Scenario: Popup view - rename account - cancel
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "Renamed account" as a new account name for account #0
    And I click on "Cancel" button on "Wallet settings" page
    Then I don't see a toast with text: "Wallet renamed successfully"
    And Wallet number 1 with "Account #0" account name is displayed on the user menu
    And "Account #0" is displayed as an account name on the menu button

  @LW-12291
  Scenario: Popup view - rename account - too long name
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "012345678901234567890" as a new account name for account #0
    Then Account name error "Max 20 characters" is displayed for account #0
    And "Save" button in disabled on "Wallet settings" page

  @LW-12301
  Scenario: Popup view - rename wallet - name cannot be empty
    When I click the menu button
    And I click on "Edit" button for wallet number 1
    And I enter "" as a new account name for account #0
    Then Account name error "Name cannot be empty" is displayed for account #0
    And "Save" button in disabled on "Wallet settings" page
