// Server-only: posts chat activity to the dedicated #chat Slack channel.
// Fire-and-forget — a Slack hiccup never blocks or fails a turn.
// SLACK_CHAT_WEBHOOK is set per-environment on the Cloud Run services
// (this repo is public, so the webhook never appears in source).
export function postChatSlack(text: string): void {
  const url = process.env.SLACK_CHAT_WEBHOOK
  if (!url) return
  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch((err) => console.error('slack chat post failed', err))
}
