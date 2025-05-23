@OnboardingCreatePaperWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Paper Wallet - Create wallet

  @LW-11152
  Scenario: Onboarding - Create - 'Choose recovery method' page is displayed
    When I click 'Create' button on wallet setup page
    Then 'Choose recovery method' page is displayed on 'Create' flow

  @LW-11153
  Scenario: Onboarding - Create - Choose a recovery method - Paper Wallet - click 'Next' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    Then 'Secure your paper wallet' page is displayed

  @LW-11154
  Scenario: Onboarding - Create - Choose a recovery method - Paper Wallet - click 'Back' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Back' button during wallet setup
    Then 'Get started' page is displayed

  @LW-11164
  Scenario: Onboarding - Create - Choose a recovery method - Paper Wallet - click 'Learn more' link
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Learn more' link on 'Choose recovery method' page
    Then FAQ page is displayed

  @LW-11155
  Scenario: Onboarding - Create - Paper Wallet - Secure your paper wallet - click 'Back' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I click 'Back' button during wallet setup
    Then 'Choose recovery method' page is displayed on 'Create' flow
    And 'Paper wallet' is selected as a recovery method

  @LW-11156
  Scenario: Onboarding - Create - Paper Wallet - Secure your paper wallet - enter valid public PGP key
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I enter valid key into 'Your PUBLIC PGP key block' input
    Then public PGP key fingerprint is displayed: 'F960 B291 7BFB A908 C031 A5AA 23E4 0848 BAB6 E1CB'
    And 'Next' button is enabled during onboarding process

  @LW-11157
  Scenario Outline: Onboarding - Create - Paper Wallet - Secure your paper wallet - enter invalid public PGP key - <error_case>
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I enter <error_case> into 'Your PUBLIC PGP key block' input
    Then error message is displayed for public PGP key input with <error_case>
    And 'Next' button is disabled during onboarding process
    Examples:
      | error_case    |
      | malformed key |
      | private key   |
      | too weak key  |

  @LW-11158
  Scenario: Onboarding - Create - Paper Wallet - Secure your paper wallet - click 'Next' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I enter 'Paper Wallet Test 1' into 'PGP key name' input
    And I enter valid key into 'Your PUBLIC PGP key block' input
    And I click 'Next' button during wallet setup
    Then 'Let's set up your new wallet' page is displayed while creating paper wallet

  @LW-11159 @memory-snapshot
  Scenario: Onboarding - Create - Paper Wallet - Let's set up your new wallet - click 'Generate paper wallet' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I enter valid key into 'Your PUBLIC PGP key block' input
    And I enter 'Paper Wallet Test 1' into 'PGP key name' input
    And I click 'Next' button during wallet setup
    And I enter wallet name: 'Wallet 1', password: 'N_8J@bne87A' and password confirmation: 'N_8J@bne87A'
    Then 'Generate paper wallet' button is enabled
    When I click 'Generate paper wallet' button
    And valid password is not in snapshot
    Then 'Save your paper wallet' page is displayed with 'Wallet_1_PaperWallet.pdf' file name

  @LW-11160
  Scenario: Onboarding - Create - Paper Wallet - Let's set up your wallet - click 'Back' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I enter valid key into 'Your PUBLIC PGP key block' input
    And I enter 'Paper Wallet Test 1' into 'PGP key name' input
    And I click 'Next' button during wallet setup
    When I click 'Back' button during wallet setup
    Then 'Secure your paper wallet' page is displayed
    And 'Your PUBLIC PGP key block' input contains previously entered value
    And 'PGP key name' input contains previously entered value

  @LW-11163
  Scenario: Onboarding - Create - Paper Wallet - Save your paper wallet - click 'Open wallet' button
    When I click 'Create' button on wallet setup page
    And I select 'Paper wallet' as a recovery method
    And I click 'Next' button during wallet setup
    And I enter valid key into 'Your PUBLIC PGP key block' input
    And I enter 'Paper Wallet Test 1' into 'PGP key name' input
    And I click 'Next' button during wallet setup
    And I enter wallet name: 'Wallet 1', password: 'N_8J@bne87A' and password confirmation: 'N_8J@bne87A'
    And I click 'Generate paper wallet' button
    Then 'Open wallet' button is disabled on 'Save your paper wallet' page
    And I click on 'Download' button on 'Save your paper wallet' page
    When I click on 'Open wallet' button on 'Save your paper wallet' page
    And I see LW homepage
