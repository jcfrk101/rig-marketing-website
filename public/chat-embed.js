// Rig breakdown-chat embed. One script tag adds the launcher + chat iframe:
//   <script async src="https://bigrig.app/chat-embed.js"></script>
// The chat itself is served from /help on the same origin (the marketing
// service behind the load balancer), so this file stays a dumb shell —
// all chat logic ships with marketing deploys.
// Optional: data-origin="https://bigrig.app" to force an absolute chat origin
// (needed when the host page is NOT served from bigrig.app, e.g. run.app URLs).
(function () {
  if (window.__rigChatEmbed) return
  window.__rigChatEmbed = true

  var script = document.currentScript
  var origin = (script && script.getAttribute('data-origin')) || ''
  var chatUrl = origin + '/help'
  var Z = '2147482000'

  var frame = null
  var open = false

  var btn = document.createElement('button')
  btn.setAttribute('aria-label', 'Chat with Dispatch')
  btn.innerHTML =
    '<span style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:#222b32;color:#0adc6a;margin-right:10px">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M21 3H3a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 3 17h3.5v3.6a.5.5 0 0 0 .82.38L12.3 17H21a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 21 3z"/>' +
    '</svg></span>Chat with Dispatch'
  btn.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:' + Z + ';display:flex;align-items:center;' +
    'background:#0adc6a;color:#222b32;border:none;border-radius:999px;padding:12px 20px 12px 16px;' +
    'font:700 15px/1 -apple-system,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;cursor:pointer;' +
    'box-shadow:0 12px 32px rgba(0,0,0,.35)'

  function panelStyle() {
    var mobile = window.innerWidth < 640
    return mobile
      ? 'position:fixed;inset:0;z-index:' + Z + ';border:none;width:100%;height:100%;background:#222b32'
      : 'position:fixed;bottom:20px;right:20px;z-index:' + Z + ';border:none;width:400px;height:680px;' +
        'max-height:calc(100vh - 40px);border-radius:16px;background:#222b32;box-shadow:0 24px 60px rgba(0,0,0,.5)'
  }

  function show() {
    if (!frame) {
      frame = document.createElement('iframe')
      frame.src = chatUrl
      frame.title = 'Rig breakdown chat'
      frame.allow = 'geolocation; camera'
      document.body.appendChild(frame)
    }
    frame.style.cssText = panelStyle()
    btn.style.display = 'none'
    open = true
  }

  function hide() {
    if (frame) frame.style.display = 'none'
    btn.style.display = 'flex'
    open = false
  }

  btn.addEventListener('click', show)
  window.addEventListener('message', function (e) {
    if (e.data === 'rig-chat:minimize' && open) hide()
  })
  window.addEventListener('resize', function () {
    if (open && frame) frame.style.cssText = panelStyle()
  })

  document.body.appendChild(btn)
})()
