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

  // Journey tracking (shared with the marketing-site launcher via same-origin
  // sessionStorage): referrer, landing page, pages browsed. The /help iframe
  // reads it and logs it with any chat that starts.
  try {
    var jk = 'rig-journey'
    var j = JSON.parse(sessionStorage.getItem(jk) || 'null') || {
      landing: location.pathname,
      referrer: document.referrer || null,
      views: 0,
      pages: [],
    }
    j.views++
    if (j.pages[j.pages.length - 1] !== location.pathname && j.pages.length < 25) j.pages.push(location.pathname)
    // Google Ads click ID (gclid/gbraid/wbraid) — kept for the session so a
    // chat lead can be reported back to Google as an offline click conversion.
    // First click wins: don't overwrite one captured on the landing page.
    if (!j.click) {
      var qs = new URLSearchParams(location.search)
      var kinds = ['gclid', 'gbraid', 'wbraid']
      for (var ki = 0; ki < kinds.length; ki++) {
        var cv = qs.get(kinds[ki])
        if (cv) { j.click = { kind: kinds[ki], id: cv }; break }
      }
    }
    sessionStorage.setItem(jk, JSON.stringify(j))
  } catch (e) {}

  var frame = null
  var open = false

  var btn = document.createElement('button')
  // Stable hook for page CTAs (e.g. the RV chat box) to open the widget
  // programmatically — the visible label/aria-label copy changes over time.
  btn.setAttribute('data-rig-chat-launcher', '1')
  btn.setAttribute('aria-label', 'Need a Mechanic? Chat Now')
  btn.innerHTML =
    '<span style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:#222b32;color:#0adc6a;margin-right:10px">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M21 3H3a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 3 17h3.5v3.6a.5.5 0 0 0 .82.38L12.3 17H21a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 21 3z"/>' +
    '</svg></span>Need a Mechanic? Chat Now'
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

  // Teaser CTA above the pill: pops 3s after load, on up to 3 page views per
  // session (counter shared with the marketing-site launcher). Opening the
  // chat retires it.
  var TK = 'rig-chat-teaser-shown'
  function teaserCount() {
    try { return parseInt(sessionStorage.getItem(TK) || '0', 10) } catch (e) { return 99 }
  }
  var teaser = null
  function retireTeaser() {
    try { sessionStorage.setItem(TK, '99') } catch (e) {}
    if (teaser) { teaser.remove(); teaser = null }
  }
  btn.addEventListener('click', retireTeaser)
  if (teaserCount() < 3) {
    setTimeout(function () {
      if (open) return
      teaser = document.createElement('div')
      teaser.style.cssText =
        'position:fixed;bottom:86px;right:20px;z-index:' + Z + ';width:264px;background:#1a2127;' +
        'border:1px solid rgba(10,220,106,.5);border-radius:16px;padding:14px 32px 14px 14px;' +
        'box-shadow:0 24px 60px rgba(0,0,0,.5);cursor:pointer;' +
        'font:400 13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif'
      teaser.innerHTML =
        '<div style="font-weight:700;font-size:14.5px;color:#fff;line-height:1.35">Chat with us — we’ll send someone out.</div>' +
        '<div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,.55)">Live dispatch · usually minutes to first offers</div>' +
        '<div data-x style="position:absolute;right:8px;top:8px;width:24px;height:24px;display:grid;place-items:center;' +
        'border-radius:999px;color:rgba(255,255,255,.4);font-size:13px">✕</div>' +
        '<div style="position:absolute;bottom:-7px;right:36px;width:14px;height:14px;transform:rotate(45deg);' +
        'background:#1a2127;border-right:1px solid rgba(10,220,106,.5);border-bottom:1px solid rgba(10,220,106,.5)"></div>'
      teaser.addEventListener('click', function (e) {
        if (e.target && e.target.getAttribute && e.target.getAttribute('data-x') !== null) {
          teaser.remove(); teaser = null // hide this page view; the show already counted
        } else {
          retireTeaser(); show()
        }
      })
      document.body.appendChild(teaser)
      try { sessionStorage.setItem(TK, String(teaserCount() + 1)) } catch (e) {}
    }, 3000)
  }
})()
