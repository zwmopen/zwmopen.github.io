// ==UserScript==
// @name         ZWM 社媒助手 Lite - 小红书
// @namespace    https://github.com/zwmopen
// @version      0.1.0
// @description  小红书当前笔记一键提取、复制 JSON/正文、复制图片链接、下载图片与视频；支持 SPA 页面切换。
// @author       zwmopen
// @match        https://www.xiaohongshu.com/*
// @match        https://xiaohongshu.com/*
// @match        https://*.xiaohongshu.com/*
// @run-at       document-idle
// @grant        unsafeWindow
// @grant        GM_setClipboard
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @connect      xhscdn.com
// @connect      *.xhscdn.com
// @connect      xhsimg.com
// @connect      *.xhsimg.com
// @require      https://raw.githubusercontent.com/zwmopen/zwmopen.github.io/master/userscripts/social-media-helper/extractor.js
// @require      https://raw.githubusercontent.com/zwmopen/zwmopen.github.io/master/userscripts/social-media-helper/ui.js
// @downloadURL  https://raw.githubusercontent.com/zwmopen/zwmopen.github.io/master/userscripts/social-media-helper.user.js
// @updateURL    https://raw.githubusercontent.com/zwmopen/zwmopen.github.io/master/userscripts/social-media-helper.user.js
// ==/UserScript==

(function () {
  'use strict';
  function start() {
    if (globalThis.ZWMSH && typeof globalThis.ZWMSH.boot === 'function') globalThis.ZWMSH.boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
