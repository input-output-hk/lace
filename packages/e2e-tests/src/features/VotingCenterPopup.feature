@VotingCenterPopup @Testnet @Mainnet
Feature: Voting Center - Popup View

  Background:
    Given Lace is ready for test

  @LW-12330 @LW-12332 @LW-13075
  Scenario: Popup view - Voting Center - open and redirect to Gov.tools/Tempo.vote
    When I navigate to Voting popup page
    Then I see "Voting Center" banner
    When I click on "Access Gov.tool" button
    Then New tab with url containing "gov.tools" is opened
    When I switch to window with Lace
    And I click on "Access Tempo.vote" button
    Then New tab with url containing "tempo.vote" is opened
