@OnboardingCreateWallet @Onboarding @Testnet @Mainnet
Feature: Onboarding - Create wallet

  @LW-2426
  Scenario: Create Wallet - Get started page displayed
    Then 'Get started' page is displayed

  @LW-10069
  Scenario Outline: 'Get started' page - Agreement text - Legal links - click on <legal_link> link
    When 'Get started' page is displayed
    And I click on '<legal_link>' legal link on 'Main page'
    Then '<legal_link>' is displayed in new tab
    Examples:
      | legal_link       |
      | Privacy policy   |
      | Terms of service |

  @LW-2433
  Scenario: Create Wallet - Wallet setup page - back button
    Given I click 'Create' button on wallet setup page
    And I go to 'Wallet setup' page from 'Create' wallet flow
    When I click 'Back' button during wallet setup
    Then 'Mnemonic verification' page is displayed from 'Create wallet' flow with 24 words

  @LW-2434
  Scenario: Create Wallet - Name your wallet - Enter wallet button disabled for empty wallet name
    Given I click 'Create' button on wallet setup page
    And I go to 'Wallet setup' page from 'Create' wallet flow
    When I enter wallet name: 'empty'
    Then 'Next' button is disabled during onboarding process

  @LW-2975
  Scenario Outline: Create Wallet - Set password - Recommendation for password: <passw_err>, password: <password>, password confirmation: <password_conf>
    Given I click 'Create' button on wallet setup page
    And I go to 'Wallet setup' page from 'Create' wallet flow and not fill values
    When I enter wallet name: 'wallet', password: '<password>' and password confirmation: '<password_conf>'
    Then Password recommendation: '<passw_err>', complexity bar level: '<complex_bar_lvl>' and password confirmation error: '<passw_conf_err>' are displayed
    Examples:
      | password    | password_conf | passw_err                                                               | complex_bar_lvl | passw_conf_err                               |
      | a           |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | P@ss        |               | core.walletNameAndPasswordSetupStep.firstLevelPasswordStrengthFeedback  | 1               | empty                                        |
      | N_8J@bne    |               | core.walletNameAndPasswordSetupStep.secondLevelPasswordStrengthFeedback | 2               | empty                                        |
      | N_8J@bne87  |               | empty                                                                   | 3               | empty                                        |
      | N_8J@bne87A | N_8J@bne87    | empty                                                                   | 4               | core.walletSetupRegisterStep.noMatchPassword |

  @LW-3013
  Scenario: Create Wallet - Mnemonic writedown page - appears correctly after 'Choose a recovery method' page
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    Then 'Mnemonic writedown' page is displayed with 24 words
    And 'Next' button is enabled during onboarding process

  @LW-3014
  Scenario: Create Wallet - Mnemonic writedown - Back button click
    Given I click 'Create' button on wallet setup page
    When I click 'Back' button during wallet setup
    Then 'Get started' page is displayed

  @LW-1553
  Scenario: Create Wallet - Mnemonic writedown - Subtitle link click
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    When I click on 'Watch video' link on 'Mnemonic writedown' page
    Then I see 'Watch video' modal
    When I click 'Read More' link in modal
    Then I see a 'FAQ' article with title 'What is my recovery phrase?'

  @LW-2251
  Scenario: Create Wallet - Mnemonic writedown - 'Help and support' button click
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    And 'Mnemonic writedown' page is displayed with 24 words
    When I click 'Help and support' button during wallet setup
    Then I see 'Help and support' page URL

  @LW-2435
  Scenario: Create Wallet - Mnemonic writedown page - next button
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    And 'Mnemonic writedown' page is displayed with 24 words
    When I click 'Next' button during wallet setup
    Then 'Mnemonic verification' page is displayed from 'Create wallet' flow with 24 words

  @LW-2439
  Scenario: Create Wallet - Mnemonic verification page displayed
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    And 'Mnemonic writedown' page is displayed with 24 words
    And I click 'Next' button during wallet setup
    Then 'Mnemonic verification' page is displayed from 'Create wallet' flow with 24 words
    And 'Next' button is disabled during onboarding process

  @LW-2441
  Scenario: Create Wallet - Mnemonic verification - back button to start over and cancel
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    And 'Mnemonic writedown' page is displayed with 24 words
    And I click 'Next' button during wallet setup
    Then 'Mnemonic verification' page is displayed from 'Create wallet' flow with 24 words
    And I click 'Back' button during wallet setup
    When I click 'Cancel' button on 'Are you sure you want to start again?' modal
    Then 'Mnemonic verification' page is displayed from 'Create wallet' flow with 24 words

  @LW-2442
  Scenario: Create Wallet - Mnemonic verification - back button to start over and new words
    Given I click 'Create' button on wallet setup page
    And I click 'Next' button during wallet setup
    And 'Mnemonic writedown' page is displayed with 24 words
    And I click 'Next' button during wallet setup
    Then 'Mnemonic verification' page is displayed from 'Create wallet' flow with 24 words
    And I click 'Back' button during wallet setup
    When I click 'OK' button on 'Are you sure you want to start again?' modal
    Then 'Mnemonic writedown' page is displayed with 24 words
