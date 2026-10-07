// ==UserScript==
// @name         Twitch -> AngelThump Player Switcher
// @namespace    https://github.com/orgazmic
// @version      1.1.0
// @description  Adds a button on Twitch channel pages that replaces the Twitch player with an AngelThump stream (prompts for channel name).
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

  const BTN_ID = 'at-switch-btn';
  const FRAME_ID = 'at-switch-frame';
  const STYLE_ID = 'at-switch-style';

  const ICON_SWAP =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>';

  let active = false;
  let lastPath = location.pathname;
  let pauser = null;
  let pausedVideos = [];

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    // Matches Twitch's dark-theme pill buttons (secondary = Gift a Sub/Subscribe, primary = Follow)
    style.textContent = `
      #${BTN_ID} {
        display: inline-flex; align-items: center; justify-content: center; gap: 4px;
        flex-shrink: 0; white-space: nowrap;
        height: 36px; padding: 0 12px; margin-right: 8px;
        border: 0; border-radius: 9999px; cursor: pointer;
        font: 600 13px/1 Inter, Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #efeff1; background-color: rgba(83, 83, 95, 0.48);
        transition: background-color 0.1s ease-in;
      }
      #${BTN_ID}:hover { background-color: rgba(83, 83, 95, 0.68); }
      #${BTN_ID}:active { background-color: rgba(83, 83, 95, 0.88); }
      #${BTN_ID}:focus-visible { outline: 2px solid #a970ff; outline-offset: 2px; }
      #${BTN_ID}.at-active { color: #fff; background-color: #9147ff; }
      #${BTN_ID}.at-active:hover { background-color: #772ce8; }
      #${BTN_ID}.at-active:active { background-color: #5c16c5; }
      #${BTN_ID} svg { flex-shrink: 0; }
    `;
    document.head.appendChild(style);
  }

  const getPlayer = () =>
    document.querySelector('.video-player') ||
    document.querySelector('[data-a-target="video-player"]');

  const currentChannel = () => location.pathname.split('/').filter(Boolean)[0] || '';

  function activate(channel) {
    const player = getPlayer();
    if (!player) {
      alert('Twitch player not found on this page.');
      return;
    }
    deactivate(false);

    if (getComputedStyle(player).position === 'static') player.style.position = 'relative';

    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.src = 'https://player.angelthump.com/?channel=' + encodeURIComponent(channel);
    frame.allow = 'autoplay; fullscreen';
    frame.allowFullscreen = true;
    frame.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;border:0;margin:0;z-index:9999;background:#000;';
    player.appendChild(frame);

    // Silence the underlying Twitch video and keep it silent
    const pauseTwitch = () =>
      document.querySelectorAll('video').forEach((v) => {
        if (!v.paused) {
          v.pause();
          if (!pausedVideos.includes(v)) pausedVideos.push(v);
        }
      });
    pauseTwitch();
    pauser = setInterval(pauseTwitch, 1000);

    active = true;
    updateButton();
  }

  function deactivate(resume = true) {
    const frame = document.getElementById(FRAME_ID);
    if (frame) frame.remove();
    if (pauser) clearInterval(pauser);
    pauser = null;
    if (resume) pausedVideos.forEach((v) => v.play().catch(() => {}));
    pausedVideos = [];
    active = false;
    updateButton();
  }

  function renderButton(btn) {
    btn.innerHTML = ICON_SWAP + '<span>' + (active ? 'Back to Twitch' : 'AngelThump') + '</span>';
    btn.classList.toggle('at-active', active);
  }

  function updateButton() {
    const btn = document.getElementById(BTN_ID);
    if (btn) renderButton(btn);
  }

  function onClick() {
    if (active) return deactivate(true);
    const input = prompt('AngelThump channel name:', currentChannel());
    if (input === null) return;
    const channel = input.trim().replace(/^@/, '').toLowerCase();
    if (!channel) return;
    activate(channel);
  }

  function ensureButton() {
    // SPA navigation: drop the AngelThump frame when the channel changes
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (active) deactivate(false);
    }

    if (document.getElementById(BTN_ID)) return;
    const host = document.querySelector('[data-target="channel-header-right"]');
    if (!host) return;

    injectStyle();
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    renderButton(btn);
    btn.addEventListener('click', onClick);
    host.prepend(btn);
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureButton();
    });
  }).observe(document.body, { childList: true, subtree: true });

  ensureButton();
})();