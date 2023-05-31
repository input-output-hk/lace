/* eslint-disable no-undef */
import CommonOnboardingElements from './commonOnboardingElements';

class AllDonePage extends CommonOnboardingElements {
  private TWITTER_LINK_ICON = '[data-testid="twitter-link-icon"]';
  private TWITTER_LINK_TEXT = '[data-testid="twitter-link-text"]';
  private YOUTUBE_LINK_ICON = '[data-testid="youtube-link-icon"]';
  private YOUTUBE_LINK_TEXT = '[data-testid="youtube-link-text"]';
  private DISCORD_LINK_ICON = '[data-testid="discord-link-icon"]';
  private DISCORD_LINK_TEXT = '[data-testid="discord-link-text"]';

  get twitterLinkIcon() {
    return $(this.TWITTER_LINK_ICON);
  }

  get twitterLinkText() {
    return $(this.TWITTER_LINK_TEXT);
  }

  get youtubeLinkIcon() {
    return $(this.YOUTUBE_LINK_ICON);
  }

  get youtubeLinkText() {
    return $(this.YOUTUBE_LINK_TEXT);
  }

  get discordLinkIcon() {
    return $(this.DISCORD_LINK_ICON);
  }

  get discordLinkText() {
    return $(this.DISCORD_LINK_TEXT);
  }
}

export default new AllDonePage();
