// ==UserScript==
// @name         Twitch -> AngelThump Player Switcher
// @namespace    https://github.com/orgazmic
// @version      1.2.0
// @description  Adds buttons on Twitch channel pages that replace only the player with an AngelThump stream or another Twitch channel (prompts for channel name).
// @author       orgazmic
// @license      MIT
// @homepageURL  https://github.com/orgazmic/twitch-angelthump-switcher
// @updateURL    https://raw.githubusercontent.com/orgazmic/twitch-angelthump-switcher/main/twitch-angelthump-switcher.user.js
// @downloadURL  https://raw.githubusercontent.com/orgazmic/twitch-angelthump-switcher/main/twitch-angelthump-switcher.user.js
// @match        https://www.twitch.tv/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const FRAME_ID = 'at-switch-frame';
  const STYLE_ID = 'at-switch-style';

  const svg = (d) =>
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
  const ICON_SWAP = svg('M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z');
  const ICON_TV = svg('M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z');

  const MODES = {
    angelthump: {
      btnId: 'at-switch-btn',
      label: 'AngelThump',
      icon: ICON_SWAP,
      prompt: 'AngelThump channel name:',
      prefill: true,
      valid: /^[a-z0-9_.-]{1,50}$/,
      src: (ch) => 'https://player.angelthump.com/?channel=' + encodeURIComponent(ch),
    },
    twitch: {
      btnId: 'at-switch-twitch-btn',
      label: 'Other Channel',
      icon: ICON_TV,
      prompt: 'Twitch channel name (or twitch.tv link):',
      prefill: false,
      valid: /^[a-z0-9_]{1,25}$/,
      src: (ch) =>
        'https://player.twitch.tv/?channel=' + encodeURIComponent(ch) +
        '&parent=' + encodeURIComponent(location.hostname) +
        '&autoplay=true&muted=false',
    },
  };

  let mode = null; // null | 'angelthump' | 'twitch'
  let lastPath = location.pathname;
  let pauser = null;
  let pausedVideos = [];

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    // Matches Twitch's dark-theme pill buttons (secondary = Gift a Sub/Subscribe, primary = Follow)
    style.textContent = `
      .at-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 4px;
        flex-shrink: 0; white-space: nowrap;
        height: 36px; padding: 0 12px; margin-right: 8px;
        border: 0; border-radius: 9999px; cursor: pointer;
        font: 600 13px/1 Inter, Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #efeff1; background-color: rgba(83, 83, 95, 0.48);
        transition: background-color 0.1s ease-in;
      }
      .at-btn:hover { background-color: rgba(83, 83, 95, 0.68); }
      .at-btn:active { background-color: rgba(83, 83, 95, 0.88); }
      .at-btn:focus-visible { outline: 2px solid #a970ff; outline-offset: 2px; }
      .at-btn.at-active { color: #fff; background-color: #9147ff; }
      .at-btn.at-active:hover { background-color: #772ce8; }
      .at-btn.at-active:active { background-color: #5c16c5; }
      .at-btn svg { flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  }

  const getPlayer = () =>
    document.querySelector('.video-player') ||
    document.querySelector('[data-a-target="video-player"]');

  const currentChannel = () => location.pathname.split('/').filter(Boolean)[0] || '';

  // "https://twitch.tv/Foo?x=1" | "@Foo" | "foo" -> "foo"
  function cleanName(input) {
    let s = input.trim().split(/[?#]/)[0];
    if (s.includes('/')) s = s.split('/').filter(Boolean).pop() || '';
    return s.replace(/^@/, '').toLowerCase();
  }

  function mount(src) {
    const player = getPlayer();
    if (!player) {
      alert('Twitch player not found on this page.');
      return false;
    }
    if (getComputedStyle(player).position === 'static') player.style.position = 'relative';

    const old = document.getElementById(FRAME_ID);
    if (old) old.remove();

    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.src = src;
    frame.allow = 'autoplay; fullscreen';
    frame.allowFullscreen = true;
    frame.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;border:0;margin:0;z-index:9999;background:#000;';
    player.appendChild(frame);

    // Silence the underlying Twitch video and keep it silent
    if (!pauser) {
      const pauseTwitch = () =>
        document.querySelectorAll('video').forEach((v) => {
          if (!v.paused) {
            v.pause();
            if (!pausedVideos.includes(v)) pausedVideos.push(v);
          }
        });
      pauseTwitch();
      pauser = setInterval(pauseTwitch, 1000);
    }
    return true;
  }

  function unmount(resume = true) {
    const frame = document.getElementById(FRAME_ID);
    if (frame) frame.remove();
    if (pauser) clearInterval(pauser);
    pauser = null;
    if (resume) pausedVideos.forEach((v) => v.play().catch(() => {}));
    pausedVideos = [];
    mode = null;
    updateButtons();
  }

  function renderButton(btn, key) {
    const def = MODES[key];
    const on = mode === key;
    btn.innerHTML = def.icon + '<span>' + (on ? 'Back to Twitch' : def.label) + '</span>';
    btn.classList.toggle('at-active', on);
  }

  function updateButtons() {
    for (const key in MODES) {
      const btn = document.getElementById(MODES[key].btnId);
      if (btn) renderButton(btn, key);
    }
  }

  function onClick(key) {
    if (mode === key) return unmount(true);
    const def = MODES[key];
    const input = prompt(def.prompt, def.prefill ? currentChannel() : '');
    if (input === null) return;
    const channel = cleanName(input);
    if (!channel) return;
    if (!def.valid.test(channel)) {
      alert('Invalid channel name: ' + channel);
      return;
    }
    if (mount(def.src(channel))) {
      mode = key;
      updateButtons();
    }
  }

  function ensureButtons() {
    // SPA navigation: drop the replacement player when the channel changes
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (mode) unmount(false);
    }

    const present = Object.values(MODES).every((d) => document.getElementById(d.btnId));
    if (present) return;
    const host = document.querySelector('[data-target="channel-header-right"]');
    if (!host) return;

    injectStyle();
    const nodes = [];
    for (const key in MODES) {
      const old = document.getElementById(MODES[key].btnId);
      if (old) old.remove();
      const btn = document.createElement('button');
      btn.id = MODES[key].btnId;
      btn.className = 'at-btn';
      btn.type = 'button';
      renderButton(btn, key);
      btn.addEventListener('click', () => onClick(key));
      nodes.push(btn);
    }
    host.prepend(...nodes);
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureButtons();
    });
  }).observe(document.body, { childList: true, subtree: true });

  ensureButtons();
})();