(function () {
  'use strict';

  const DEFAULTS = {
    plugin_playlist:     false,
    plugin_verification: false,
    plugin_savevideo:    false,
    plugin_status:       false,
    custom_status_text:  '',
    theme:               'default',
    custom_css:          '',
  };

  let SETTINGS = { ...DEFAULTS };

  function loadSettings() {
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.data?.type === 'tiktokmod:settings') {
          window.removeEventListener('message', handler);
          SETTINGS = { ...DEFAULTS, ...e.data.settings };
          resolve();
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ type: 'tiktokmod:getSettings' }, '*');
      setTimeout(() => { window.removeEventListener('message', handler); resolve(); }, 600);
    });
  }

  function saveSetting(key, value) {
    SETTINGS[key] = value;
    window.postMessage({ type: 'tiktokmod:saveSettings', settings: { [key]: value } }, '*');
  }

  function injectCSS(id, css) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    el.textContent = css;
  }

  // ─── Plugin: Fake Verification Badge ─────────────────────────────────────
  const BADGE_URL = 'https://raw.githubusercontent.com/zxkuhl/RMS-dev/refs/heads/main/2596-removebg-preview.png';

  function plugin_verification() {
    const existing = document.querySelectorAll('.tmod-verify-badge');
    existing.forEach(b => b.remove());
    if (!SETTINGS.plugin_verification) return;

    const inject = () => {
      // Target the username/display name in the header/nav area
      const selectors = [
        '[data-e2e="nav-avatar"]',
        '[class*="DivAvatarContainer"]',
        '[class*="UserName"]',
        '[class*="NickName"]',
        '[class*="username"]',
        'header [class*="Avatar"]',
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (el.querySelector('.tmod-verify-badge')) return;
          const badge = document.createElement('img');
          badge.className = 'tmod-verify-badge';
          badge.src = BADGE_URL;
          badge.style.cssText = 'width:18px;height:18px;display:inline-block;vertical-align:middle;margin-left:4px;position:relative;z-index:999;pointer-events:none;';
          el.style.position = 'relative';
          el.appendChild(badge);
        });
      });
    };
    inject();
    new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Plugin: Save Without Watermark ──────────────────────────────────────
  function plugin_savevideo() {
    if (!SETTINGS.plugin_savevideo) {
      document.querySelectorAll('.tmod-dl-nowm').forEach(b => b.remove()); return;
    }
    new MutationObserver(() => {
      document.querySelectorAll('video').forEach(video => {
        const wrap = video.closest('[class*="DivVideoWrapper"],[class*="video-card"],[class*="swiper-slide"],[class*="DivContainer"]');
        if (!wrap || wrap.querySelector('.tmod-dl-nowm')) return;
        wrap.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'tmod-dl-nowm';
        btn.title = 'Save without watermark';
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
        btn.style.cssText = 'position:absolute;bottom:76px;right:10px;z-index:9999;background:rgba(22,24,35,0.85);border:none;border-radius:50%;width:36px;height:36px;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);transition:background 0.2s;';
        btn.onmouseenter = () => btn.style.background = 'rgba(254,44,85,0.9)';
        btn.onmouseleave = () => btn.style.background = 'rgba(22,24,35,0.85)';
        btn.onclick = async (e) => {
          e.stopPropagation();
          // Try to get clean src (without watermark query params)
          let src = video.src || video.querySelector('source')?.src || '';
          // Remove TikTok watermark params if present
          try { const u = new URL(src); u.searchParams.delete('wm'); u.searchParams.delete('watermark'); src = u.toString(); } catch(_){}
          if (src) {
            btn.innerHTML = '⏳';
            try {
              const res = await fetch(src);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'tiktok-nowm.mp4'; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 5000);
              btn.innerHTML = '✅'; setTimeout(() => btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`, 2000);
            } catch(err) {
              btn.innerHTML = '❌'; setTimeout(() => btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`, 2000);
            }
          }
        };
        wrap.appendChild(btn);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Plugin: Custom Status ────────────────────────────────────────────────
  function plugin_status() {
    document.querySelectorAll('.tmod-status-badge').forEach(b => b.remove());
    if (!SETTINGS.plugin_status || !SETTINGS.custom_status_text) return;
    const inject = () => {
      const bioSelectors = ['[data-e2e="user-bio"]','[class*="UserBio"]','[class*="DivBioContainer"]','[class*="bio"]'];
      bioSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (el.querySelector('.tmod-status-badge')) return;
          const badge = document.createElement('span');
          badge.className = 'tmod-status-badge';
          badge.textContent = SETTINGS.custom_status_text;
          badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(254,44,85,0.12);border:1px solid rgba(254,44,85,0.3);color:#fe2c55;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:500;margin-left:6px;vertical-align:middle;';
          el.appendChild(badge);
        });
      });
    };
    inject();
    new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Plugin: Playlist Without 10K ────────────────────────────────────────
  function plugin_playlist() {
    if (!SETTINGS.plugin_playlist) {
      document.getElementById('tmod-playlist-css')?.remove(); return;
    }
    // Show playlist creation UI that TikTok hides behind follower gate
    injectCSS('tmod-playlist-css', `
      [class*="DivPlaylistCreate"][style*="display: none"],
      [class*="playlist-create"][style*="display: none"],
      [data-e2e="playlist-create"][style*="display: none"] {
        display: flex !important;
      }
      [class*="PlaylistGate"], [class*="follower-gate"] { display: none !important; }
    `);
    // Also unhide via attribute
    const tryUnlock = () => {
      document.querySelectorAll('[data-e2e*="playlist"]').forEach(el => {
        if (el.style.display === 'none') el.style.display = '';
        el.removeAttribute('disabled');
      });
    };
    tryUnlock();
    new MutationObserver(tryUnlock).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Theme Engine ─────────────────────────────────────────────────────────
  const THEMES = {
    default:  '',
    dark:     'body,[class*="DivBodyWrapper"]{background:#000!important}[class*="DivSideBar"]{background:#0a0a0a!important}',
    pink:     '[class*="DivSideBar"],[class*="HeaderWrapper"]{background:linear-gradient(135deg,#1a0010,#2d0020)!important}[class*="ButtonAction"],[data-e2e="like-count"]{color:#ff2d78!important}a,[class*="username"]{color:#ff6ba0!important}',
    midnight: 'body{background:#050714!important}[class*="DivSideBar"]{background:#06091a!important}',
    matrix:   'body{background:#001a0a!important}[class*="DivSideBar"]{background:#001208!important}[class*="ButtonAction"]{color:#00ff7f!important}',
    retro:    'body{background:#1a0a00!important;filter:sepia(0.3) saturate(1.2)}[class*="DivSideBar"]{background:#120800!important}',
    lavender: 'body{background:#0d0b14!important}[class*="DivSideBar"]{background:#110e1a!important}[class*="ButtonAction"]{color:#b57bee!important}',
  };
  function applyTheme() {
    injectCSS('tmod-theme', (THEMES[SETTINGS.theme] || '') + '\n' + (SETTINGS.custom_css || ''));
  }

  // ─── Settings Page Injection ───────────────────────────────────────────────
  const PLUGIN_LIST = [
    {
      id: 'plugin_playlist',
      name: 'Playlist without 10K followers',
      desc: 'Unlock playlist creation without needing 10,000 followers',
      extra: null,
    },
    {
      id: 'plugin_verification',
      name: 'Fake verification',
      desc: 'Display a verification badge on your profile',
      extra: null,
      badgeImg: BADGE_URL,
    },
    {
      id: 'plugin_savevideo',
      name: 'Save video without watermark',
      desc: 'Download button that strips the TikTok watermark',
      extra: null,
    },
    {
      id: 'plugin_status',
      name: 'Custom status',
      desc: 'Set a custom status that shows on your profile',
      extra: 'status_input',
    },
  ];

  const THEME_LIST = [
    { id: 'default',  name: 'Default',      c1: '#161823', c2: '#1a1a2e' },
    { id: 'dark',     name: 'Pure Dark',     c1: '#000',    c2: '#111' },
    { id: 'pink',     name: 'Pink Neon',     c1: '#1a0010', c2: '#2d0020' },
    { id: 'midnight', name: 'Midnight',      c1: '#050714', c2: '#0a0f2e' },
    { id: 'matrix',   name: 'Matrix',        c1: '#001a0a', c2: '#003015' },
    { id: 'retro',    name: 'Retro',         c1: '#1a0a00', c2: '#2d1500' },
    { id: 'lavender', name: 'Lavender',      c1: '#0d0b14', c2: '#1c1530' },
    { id: 'custom',   name: 'Custom CSS',    c1: '#1a1a2e', c2: '#2a2a40', icon: '✏️' },
  ];

  const DOCS = [
    {
      title: 'Getting Started',
      icon: '🚀',
      body: `<p>TikTok Mod injects directly into TikTok's settings page. Toggle features on/off and they apply instantly.</p>
<h4>Setup</h4>
<ol><li>Enable the plugins you want below.</li><li>Pick a theme or write custom CSS.</li><li>Most changes apply without a page reload.</li></ol>`,
    },
    {
      title: 'Plugins Guide',
      icon: '🔌',
      body: `<h4>Playlist without 10K</h4><p>Unlocks TikTok's hidden playlist UI that is normally gated behind 10,000 followers.</p>
<h4>Fake Verification</h4><p>Injects the verification badge image next to your username on your profile. Visual only — not a real verified account.</p>
<h4>Save Without Watermark</h4><p>Adds a download button on videos. Attempts to strip watermark query parameters before saving.</p>
<h4>Custom Status</h4><p>Displays a custom status badge on your profile bio area. Type any text — emoji supported.</p>`,
    },
    {
      title: 'Themes & Custom CSS',
      icon: '🎨',
      body: `<p>Pick a preset theme or write your own CSS. Custom CSS runs after the theme, so you can override anything.</p>
<h4>Example</h4>
<pre>body { background: #0a0a0a !important; }
[data-e2e="like-count"] { color: #00ffcc !important; }</pre>
<p>Use browser DevTools (F12) to inspect TikTok's class names.</p>`,
    },
    {
      title: 'FAQ',
      icon: '❓',
      body: `<h4>Will I get banned?</h4><p>TikTok Mod only modifies your local view and doesn't interact with TikTok's API or servers beyond normal browsing. No bans reported.</p>
<h4>The download doesn't work</h4><p>Some videos are DRM-protected. The button will show ❌ if the download fails.</p>
<h4>The verification badge doesn't show</h4><p>TikTok changes class names frequently. If it stops working, a selector update may be needed.</p>`,
    },
  ];

  function buildSettingsUI() {
    if (document.getElementById('tmod-root')) return;

    // Find best insertion point — after TikTok's last settings section
    const candidates = [
      document.querySelector('[class*="DivSettingContainer"]'),
      document.querySelector('[class*="setting-container"]'),
      document.querySelector('[class*="DivMainContent"]'),
      document.querySelector('main'),
    ];
    const container = candidates.find(Boolean);
    if (!container) return;

    const root = document.createElement('div');
    root.id = 'tmod-root';

    root.innerHTML = `
<style>
/* ── Root wrapper matches TikTok's setting page padding/width ── */
#tmod-root {
  padding: 0 24px 40px;
  max-width: 700px;
  color: #e8e8e8;
  font-family: -apple-system, "Segoe UI", sans-serif;
}

/* ── Section heading exactly like TikTok's bold section titles ── */
.tmod-section-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 32px 0 0 0;
  padding: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.tmod-version {
  font-size: 11px;
  color: #fe2c55;
  font-weight: 500;
  background: rgba(254,44,85,0.1);
  border: 1px solid rgba(254,44,85,0.25);
  border-radius: 20px;
  padding: 2px 8px;
  margin-left: 4px;
}

/* ── Sub-nav tabs matching TikTok's inline tab style ── */
.tmod-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin: 0 0 4px 0;
}
.tmod-tab {
  padding: 12px 0;
  margin-right: 28px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
  font-family: inherit;
  white-space: nowrap;
}
.tmod-tab:hover { color: rgba(255,255,255,0.85); }
.tmod-tab.tmod-active {
  color: #fff;
  border-bottom-color: #fe2c55;
  font-weight: 700;
}

/* ── Panels ── */
.tmod-panel { display: none; padding-top: 4px; }
.tmod-panel.tmod-active { display: block; }

/* ── Row — exactly like TikTok's setting rows ── */
.tmod-row {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  gap: 12px;
}
.tmod-row:last-child { border-bottom: none; }

.tmod-row-info { flex: 1; min-width: 0; }
.tmod-row-name {
  font-size: 15px;
  font-weight: 400;
  color: #fff;
  line-height: 1.3;
}
.tmod-row-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.45);
  margin-top: 3px;
  line-height: 1.4;
}
.tmod-row-badge-preview {
  width: 20px; height: 20px;
  margin-left: 6px;
  vertical-align: middle;
  display: inline-block;
}

/* ── Status text input (TikTok-style input field) ── */
.tmod-status-wrap {
  width: 100%;
  padding: 0 0 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tmod-status-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  padding: 10px 14px;
  outline: none;
  margin-top: 8px;
  transition: border-color 0.2s;
}
.tmod-status-input:focus { border-color: rgba(254,44,85,0.6); }
.tmod-status-input::placeholder { color: rgba(255,255,255,0.25); }
.tmod-status-save {
  margin-top: 8px;
  padding: 8px 20px;
  background: #fe2c55;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
}
.tmod-status-save:hover { opacity: 0.85; }
.tmod-status-saved { font-size: 12px; color: rgba(255,255,255,0.4); margin-left: 10px; opacity:0; transition: opacity 0.3s; }
.tmod-status-saved.tmod-show { opacity:1; }

/* ── Toggle — styled like TikTok's native toggles ── */
.tmod-toggle {
  position: relative;
  width: 51px; height: 31px;
  flex-shrink: 0; cursor: pointer;
}
.tmod-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.tmod-toggle-bg {
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.15);
  border-radius: 16px;
  transition: background 0.25s;
}
.tmod-toggle-knob {
  position: absolute;
  top: 3px; left: 3px;
  width: 25px; height: 25px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: transform 0.25s;
  pointer-events: none;
}
.tmod-toggle input:checked + .tmod-toggle-bg { background: #fe2c55; }
.tmod-toggle input:checked ~ .tmod-toggle-knob { transform: translateX(20px); }

/* ── Themes grid ── */
.tmod-themes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 16px 0 8px;
}
.tmod-theme-card {
  border: 2px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
}
.tmod-theme-card:hover { transform: scale(1.03); }
.tmod-theme-card.tmod-selected { border-color: #fe2c55; }
.tmod-theme-swatch {
  height: 44px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}
.tmod-theme-label {
  padding: 5px 6px;
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  background: rgba(0,0,0,0.35);
  color: rgba(255,255,255,0.55);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tmod-theme-card.tmod-selected .tmod-theme-label { color: #fe2c55; }

/* ── Custom CSS textarea ── */
.tmod-css-label {
  font-size: 13px;
  color: rgba(255,255,255,0.45);
  margin: 16px 0 8px;
}
.tmod-css-input {
  width: 100%;
  min-height: 110px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e8e8e8;
  font-family: 'Courier New', monospace;
  font-size: 12.5px;
  padding: 12px 14px;
  resize: vertical;
  outline: none;
  line-height: 1.6;
  transition: border-color 0.2s;
}
.tmod-css-input:focus { border-color: rgba(254,44,85,0.5); }
.tmod-css-input::placeholder { color: rgba(255,255,255,0.2); }
.tmod-apply-btn {
  margin-top: 14px;
  padding: 10px 28px;
  background: #fe2c55;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
}
.tmod-apply-btn:hover { opacity: 0.85; }
.tmod-theme-saved { font-size: 12px; color: rgba(255,255,255,0.4); margin-left: 12px; opacity:0; transition: opacity 0.3s; }
.tmod-theme-saved.tmod-show { opacity:1; }

/* ── Docs accordion ── */
.tmod-doc-item {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tmod-doc-item:last-child { border-bottom: none; }
.tmod-doc-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 16px 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  font-weight: 400;
  cursor: pointer;
  gap: 12px;
  text-align: left;
}
.tmod-doc-trigger:hover { color: rgba(255,255,255,0.8); }
.tmod-doc-icon { font-size: 18px; }
.tmod-doc-trigger-text { flex: 1; }
.tmod-doc-arrow {
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  transition: transform 0.2s;
}
.tmod-doc-item.tmod-open .tmod-doc-arrow { transform: rotate(180deg); }
.tmod-doc-body {
  display: none;
  padding: 0 0 16px 30px;
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  line-height: 1.7;
}
.tmod-doc-item.tmod-open .tmod-doc-body { display: block; }
.tmod-doc-body h4 { color: rgba(255,255,255,0.75); font-size: 13px; margin: 12px 0 4px; font-weight: 600; }
.tmod-doc-body p { margin: 0 0 6px; }
.tmod-doc-body ol, .tmod-doc-body ul { padding-left: 16px; margin: 4px 0 8px; }
.tmod-doc-body li { margin-bottom: 3px; }
.tmod-doc-body pre {
  background: rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'Courier New', monospace;
  font-size: 11.5px;
  color: rgba(37,244,238,0.9);
  overflow-x: auto;
  margin: 8px 0;
}
</style>

<div class="tmod-section-title">
  TikTok Mod <span class="tmod-version">v1.0.0</span>
</div>

<div class="tmod-tabs">
  <button class="tmod-tab tmod-active" data-tab="plugins">Plugins</button>
  <button class="tmod-tab" data-tab="themes">Themes</button>
  <button class="tmod-tab" data-tab="docs">Docs</button>
</div>

<div class="tmod-panel tmod-active" id="tmod-panel-plugins"></div>
<div class="tmod-panel" id="tmod-panel-themes">
  <div class="tmod-themes-grid" id="tmod-themes-grid"></div>
  <div class="tmod-css-label">Custom CSS</div>
  <textarea class="tmod-css-input" id="tmod-css-input" placeholder="/* Write your own styles */&#10;/* e.g. body { background: #ff0000; } */"></textarea>
  <div style="display:flex;align-items:center;">
    <button class="tmod-apply-btn" id="tmod-apply-btn">Apply Theme</button>
    <span class="tmod-theme-saved" id="tmod-theme-saved">✓ Applied</span>
  </div>
</div>
<div class="tmod-panel" id="tmod-panel-docs"></div>
`;

    container.appendChild(root);

    // ── Plugins ──
    const pluginsPanel = document.getElementById('tmod-panel-plugins');
    PLUGIN_LIST.forEach(p => {
      const row = document.createElement('div');
      row.className = 'tmod-row';

      const badgePreview = p.badgeImg
        ? `<img src="${p.badgeImg}" class="tmod-row-badge-preview" />`
        : '';

      row.innerHTML = `
        <div class="tmod-row-info">
          <div class="tmod-row-name">${p.name}${badgePreview}</div>
          <div class="tmod-row-desc">${p.desc}</div>
        </div>
        <label class="tmod-toggle">
          <input type="checkbox" id="tmod-${p.id}" ${SETTINGS[p.id] ? 'checked' : ''} />
          <div class="tmod-toggle-bg"></div>
          <div class="tmod-toggle-knob"></div>
        </label>`;

      pluginsPanel.appendChild(row);

      // Status input below its row
      if (p.extra === 'status_input') {
        const statusWrap = document.createElement('div');
        statusWrap.className = 'tmod-status-wrap';
        statusWrap.id = 'tmod-status-wrap';
        statusWrap.style.display = SETTINGS.plugin_status ? 'block' : 'none';
        statusWrap.innerHTML = `
          <input class="tmod-status-input" id="tmod-status-input" type="text" maxlength="60"
            placeholder="Your status text… e.g. 🎵 Making content" value="${SETTINGS.custom_status_text || ''}" />
          <div style="display:flex;align-items:center;">
            <button class="tmod-status-save" id="tmod-status-save">Save status</button>
            <span class="tmod-status-saved" id="tmod-status-saved">✓ Saved</span>
          </div>`;
        pluginsPanel.appendChild(statusWrap);

        document.getElementById('tmod-status-save').addEventListener('click', () => {
          const val = document.getElementById('tmod-status-input').value.trim();
          saveSetting('custom_status_text', val);
          plugin_status();
          const msg = document.getElementById('tmod-status-saved');
          msg.classList.add('tmod-show');
          setTimeout(() => msg.classList.remove('tmod-show'), 2000);
        });
      }

      row.querySelector('input').addEventListener('change', (e) => {
        saveSetting(p.id, e.target.checked);
        if (p.id === 'plugin_status') {
          const w = document.getElementById('tmod-status-wrap');
          if (w) w.style.display = e.target.checked ? 'block' : 'none';
        }
        // Re-run relevant plugin
        if (p.id === 'plugin_playlist')     plugin_playlist();
        if (p.id === 'plugin_verification') plugin_verification();
        if (p.id === 'plugin_savevideo')    plugin_savevideo();
        if (p.id === 'plugin_status')       plugin_status();
      });
    });

    // ── Themes ──
    const grid = document.getElementById('tmod-themes-grid');
    let selectedTheme = SETTINGS.theme || 'default';
    THEME_LIST.forEach(t => {
      const card = document.createElement('div');
      card.className = 'tmod-theme-card' + (selectedTheme === t.id ? ' tmod-selected' : '');
      card.dataset.tid = t.id;
      card.innerHTML = `
        <div class="tmod-theme-swatch" style="background:linear-gradient(135deg,${t.c1},${t.c2})">${t.icon || ''}</div>
        <div class="tmod-theme-label">${t.name}</div>`;
      card.addEventListener('click', () => {
        grid.querySelectorAll('.tmod-theme-card').forEach(c => c.classList.remove('tmod-selected'));
        card.classList.add('tmod-selected');
        selectedTheme = t.id;
      });
      grid.appendChild(card);
    });
    document.getElementById('tmod-css-input').value = SETTINGS.custom_css || '';
    document.getElementById('tmod-apply-btn').addEventListener('click', () => {
      const css = document.getElementById('tmod-css-input').value;
      saveSetting('theme', selectedTheme);
      saveSetting('custom_css', css);
      SETTINGS.theme = selectedTheme;
      SETTINGS.custom_css = css;
      applyTheme();
      const msg = document.getElementById('tmod-theme-saved');
      msg.classList.add('tmod-show');
      setTimeout(() => msg.classList.remove('tmod-show'), 2200);
    });

    // ── Docs ──
    const docsPanel = document.getElementById('tmod-panel-docs');
    DOCS.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'tmod-doc-item';
      item.innerHTML = `
        <button class="tmod-doc-trigger">
          <span class="tmod-doc-icon">${doc.icon}</span>
          <span class="tmod-doc-trigger-text">${doc.title}</span>
          <span class="tmod-doc-arrow">▼</span>
        </button>
        <div class="tmod-doc-body">${doc.body}</div>`;
      item.querySelector('.tmod-doc-trigger').addEventListener('click', () => item.classList.toggle('tmod-open'));
      docsPanel.appendChild(item);
    });

    // ── Tab switching ──
    root.querySelectorAll('.tmod-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.tmod-tab').forEach(t => t.classList.remove('tmod-active'));
        root.querySelectorAll('.tmod-panel').forEach(p => p.classList.remove('tmod-active'));
        tab.classList.add('tmod-active');
        document.getElementById('tmod-panel-' + tab.dataset.tab).classList.add('tmod-active');
      });
    });
  }

  // ─── SPA Navigation Watcher ────────────────────────────────────────────────
  function watchNav() {
    const tryInject = () => {
      if (/\/setting/.test(location.pathname)) {
        setTimeout(() => {
          if (!document.getElementById('tmod-root')) buildSettingsUI();
        }, 600);
      } else {
        document.getElementById('tmod-root')?.remove();
      }
    };
    tryInject();
    const orig = history.pushState.bind(history);
    history.pushState = (...a) => { orig(...a); tryInject(); };
    window.addEventListener('popstate', tryInject);
    let last = location.href;
    new MutationObserver(() => {
      if (location.href !== last) { last = location.href; tryInject(); }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  async function init() {
    await loadSettings();
    runAllPlugins();
    applyTheme();
    watchNav();
    console.log('%c[TikTok Mod] ✓', 'color:#fe2c55;font-weight:bold');
  }

  function runAllPlugins() {
    plugin_playlist();
    plugin_verification();
    plugin_savevideo();
    plugin_status();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
