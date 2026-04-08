import { elements } from "./dom.js";
import { escapeHtml } from "./utils.js";

export function showSlackSetup(config) {
  elements.slackSetupForm.hidden = false;
  elements.clientIdInput.value =
    config.slackConfigIssue === "Placeholder Slack credentials detected in .env."
      ? ""
      : elements.clientIdInput.value;
  elements.clientSecretInput.value = "";
  elements.redirectUriInput.value =
    config.redirectUri || `${window.location.origin}/auth/slack/callback`;
  renderSetupCard();
}

function renderSetupCard() {
  elements.detailCard.innerHTML = `
    <div class="fade-in">
      <h3>Slack setup needed</h3>
      <p>This app is ready for live Slack auth, but it still needs your Slack app credentials.</p>
      <div class="detail-list">
        <div><strong>Required:</strong> Client ID and Client Secret from your Slack app</div>
        <div><strong>Redirect URL:</strong> ${escapeHtml(elements.redirectUriInput.value)}</div>
        <div><strong>Tip:</strong> After saving, click Connect Slack and Slack-Graph will open the OAuth flow.</div>
      </div>
    </div>
  `;
}

export function renderSetupSuccess() {
  elements.detailCard.innerHTML = `
    <div class="fade-in">
      <h3>Slack ready</h3>
      <p>Your credentials are saved locally for this project. The next Connect Slack click will open the real authorization screen.</p>
      <div class="detail-list">
        <div><strong>Saved redirect URL:</strong> ${escapeHtml(elements.redirectUriInput.value)}</div>
        <div><strong>Next step:</strong> connect Slack, then refresh the graph with your live messages.</div>
      </div>
    </div>
  `;
}
