@AddNewWalletCreatePaperWallet @Testnet @Mainnet
Feature: Add new wallet - Create paper wallet

  Background:
    Given Lace is ready for test

  @LW-11327
  Scenario: Add new wallet - Create - "Choose recovery method" page is displayed
    When I opened "Create" flow via "Add new wallet" feature
    Then "Choose recovery method" page is displayed in modal for "Create" flow

  @LW-11328
  Scenario: Add new wallet - Create - Choose recovery method - Paper Wallet - click "Next" button
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    Then "Secure your paper wallet" page is displayed in modal

  @LW-11329
  Scenario: Add new wallet - Create - Choose recovery method - Paper Wallet - click "Back" button
    When I opened "Create" flow via "Add new wallet" feature
    And I click "Back" button during wallet setup
    Then I see onboarding main screen within modal over the active Lace page in expanded view

  @LW-11332
  Scenario: Add new wallet - Create - Secure your paper wallet - click "Back" button
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I click "Back" button during wallet setup
    Then "Choose recovery method" page is displayed in modal for "Create" flow

  @LW-11333
  Scenario: Add new wallet - Create - Paper Wallet - Secure your paper wallet - enter valid public PGP key
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I enter valid key into "Your PUBLIC PGP key block" input
    Then public PGP key fingerprint is displayed: "F960 B291 7BFB A908 C031 A5AA 23E4 0848 BAB6 E1CB"
    And "Next" button is enabled during onboarding process

  @LW-11334
  Scenario Outline: Add new wallet - Create - Paper Wallet - Secure your paper wallet - enter invalid public PGP key - <error_case>
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I enter <error_case> into "Your PUBLIC PGP key block" input
    Then error message is displayed for public PGP key input with <error_case>
    And "Next" button is disabled during onboarding process
    Examples:
      | error_case    |
      | malformed key |
      | private key   |
      | too weak key  |

  @LW-11336
  Scenario: Add new wallet - Create - Secure your paper wallet - click "Next" button
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button during wallet setup
    Then "Let's set up your new wallet" page is displayed in modal for "Create paper wallet" flow

  @LW-11337
  Scenario: Add new wallet - Create - Paper Wallet - Let's set up your new wallet - click "Generate paper wallet" button
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button during wallet setup
    And I enter wallet name: "Wallet 1", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    Then "Generate paper wallet" button is enabled
    When I click "Generate paper wallet" button
    Then "Save your paper wallet" page is displayed in modal with "Wallet_1_PaperWallet.pdf" file name

  @LW-11338
  Scenario: Add new wallet - Create - Paper Wallet - Let's set up your wallet - click "Back" button
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button during wallet setup
    And I click "Back" button during wallet setup
    Then "Secure your paper wallet" page is displayed in modal

  @LW-11341
  Scenario: Add new wallet - Create - Paper wallet - Save your paper wallet - click "Open wallet" button
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Next" button during wallet setup
    And I enter "Paper Wallet Test 1" into "PGP key name" input
    And I enter valid key into "Your PUBLIC PGP key block" input
    And I click "Next" button during wallet setup
    And I enter wallet name: "Paper Wallet 1", password: "N_8J@bne87A" and password confirmation: "N_8J@bne87A"
    And I click "Generate paper wallet" button
    Then "Open wallet" button is disabled on "Save your paper wallet" page
    When I click on "Download" button on "Save your paper wallet" page
    And I click on "Open wallet" button on "Save your paper wallet" page
    And I wait for main loader to disappear
    Then I see LW homepage
    And "Paper Wall..." is displayed as a wallet name on the menu button
    When I click the menu button
    Then Wallet number 2 with "Paper Wallet..." name is displayed on the user menu

  @LW-11342
  Scenario: Add new wallet - Create - Paper wallet - Choose recovery method - click "Learn more" link
    When I opened "Create" flow via "Add new wallet" feature
    And I select "Paper wallet" as a recovery method
    And I click "Learn more" link on "Choose recovery method" page
    Then FAQ page is displayed
