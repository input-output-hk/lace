@VotingCenterExtended @Testnet @Mainnet
Feature: Voting Center - Extended View

  Background:
    Given Lace is ready for test

  @LW-12329 @LW-12331 @LW-13074
  Scenario: Extended view - Voting Center - open and redirect to Gov.tools/Tempo.vote
    When I navigate to Voting extended page
    Then I see "Voting Center" banner
    And I see "Learn about" widget with all relevant items
    When I click on "Access Gov.tool" button
    Then New tab with url containing "gov.tools" is opened
    When I switch to window with Lace
    And I click on "Access Tempo.vote" button
    Then New tab with url containing "tempo.vote" is opened
