// ==UserScript==
// @name         ZWM 社媒助手 Lite - 小红书
// @namespace    https://github.com/zwmopen
// @version      0.2.0
// @description  手机优先：提取小红书当前笔记、复制 JSON/正文/媒体链接、下载图片和视频；支持 SPA 页面切换。
// @author       zwmopen
// @match        https://www.xiaohongshu.com/*
// @match        https://xiaohongshu.com/*
// @match        https://*.xiaohongshu.com/*
// @run-at       document-idle
// @grant        unsafeWindow
// @grant        GM_setClipboard
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      xhscdn.com
// @connect      *.xhscdn.com
// @connect      xhsimg.com
// @connect      *.xhsimg.com
// @homepageURL  https://zwmopen.github.io/userscripts/social-media-helper/
// @downloadURL  https://raw.githubusercontent.com/zwmopen/zwmopen.github.io/master/userscripts/social-media-helper.user.js
// @updateURL    https://raw.githubusercontent.com/zwmopen/zwmopen.github.io/master/userscripts/social-media-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VERSION = '0.2.0';
  var PAGE = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  var HOST_ID = 'zwm-social-helper-host';
  var lastUrl = location.href;
  var timer = null;
  var observer = null;
  var toastTimer = null;
  var booted = false;

  function q(selector, root) {
    try { return (root || document).querySelector(selector); } catch (_) { return null; }
  }

  function qa(selector, root) {
    try { return Array.from((root || document).querySelectorAll(selector)); } catch (_) { return []; }
  }

  function clean(value) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  }

  function uniq(list) {
    return Array.from(new Set((list || []).filter(Boolean)));
  }

  function normalizeUrl(value) {
    if (!value || typeof value !== 'string') return '';
    var v = value.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (v.indexOf('//') === 0) v = 'https:' + v;
    return /^https?:\/\//i.test(v) ? v : '';
  }

  function noteId() {
    var u = location.href;
    var patterns = [
      /\/explore\/([a-zA-Z0-9]{24})(?:[/?#]|$)/,
      /\/discovery\/item\/([a-zA-Z0-9]{24})(?:[/?#]|$)/,
      /\/note\/([a-zA-Z0-9]{24})(?:[/?#]|$)/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = u.match(patterns[i]);
      if (m) return m[1];
    }
    try {
      var v = new URL(u).searchParams.get('note_id') || '';
      return /^[a-zA-Z0-9]{24}$/.test(v) ? v : '';
    } catch (_) {
      return '';
    }
  }

  function isNotePage() {
    return !!noteId();
  }

  function meta(name, property) {
    var el = q('meta[' + (property ? 'property' : 'name') + '="' + name + '"]');
    return clean(el && el.content || '');
  }

  function unwrap(obj) {
    return obj && typeof obj === 'object'
      ? (obj.noteCard || obj.note_card || obj.note || obj.noteDetail || obj.note_detail || obj)
      : obj;
  }

  function candidateId(obj) {
    if (!obj || typeof obj !== 'object') return '';
    return String(
      obj.noteId != null ? obj.noteId :
      obj.note_id != null ? obj.note_id :
      obj.id != null ? obj.id : ''
    );
  }

  function score(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return -1;
    var s = 0;
    if (obj.title || obj.displayTitle || obj.display_title) s += 2;
    if (obj.desc || obj.description || obj.content) s += 2;
    if (obj.user || obj.author || obj.userInfo || obj.user_info) s += 2;
    if (obj.imageList || obj.image_list || obj.images) s += 4;
    if (obj.video || obj.videoInfo || obj.video_info) s += 3;
    if (obj.interactInfo || obj.interact_info) s += 1;
    return s;
  }

  function bestNote(root, id) {
    if (!root || typeof root !== 'object') return null;
    var seen = new WeakSet();
    var stack = [{ value: root, depth: 0 }];
    var exact = null;
    var exactScore = -1;
    var fallback = null;
    var fallbackScore = -1;
    var visits = 0;

    while (stack.length && visits++ < 26000) {
      var node = stack.pop();
      var value = node.value;
      var depth = node.depth;
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);

      var unwrapped = unwrap(value);
      var sc = score(unwrapped);
      var cid = candidateId(unwrapped);
      if (id && cid === id && sc > exactScore) {
        exact = unwrapped;
        exactScore = sc;
      }
      if (!id && sc > fallbackScore) {
        fallback = unwrapped;
        fallbackScore = sc;
      }

      if (depth >= 10) continue;
      var children = Array.isArray(value) ? value.slice(0, 160) : Object.values(value).slice(0, 220);
      for (var i = children.length - 1; i >= 0; i--) {
        if (children[i] && typeof children[i] === 'object') {
          stack.push({ value: children[i], depth: depth + 1 });
        }
      }
    }

    if (id) return exactScore >= 3 ? exact : null;
    return fallbackScore >= 5 ? fallback : null;
  }

  function roots() {
    var out = [];
    var keys = ['__INITIAL_STATE__', '__INITIAL_SSR_STATE__', '__NEXT_DATA__', '__NUXT__'];
    keys.forEach(function (key) {
      try {
        if (PAGE && PAGE[key] && typeof PAGE[key] === 'object') out.push(PAGE[key]);
      } catch (_) {}
    });
    qa('script[type="application/json"]').forEach(function (script) {
      try {
        var text = script.textContent || '';
        if (text && text.length < 12000000) out.push(JSON.parse(text));
      } catch (_) {}
    });
    return out;
  }

  function imageFromInfo(info) {
    if (!info) return '';
    if (typeof info === 'string') return normalizeUrl(info);
    var direct = normalizeUrl(
      info.url_default || info.urlDefault || info.url ||
      info.url_pre || info.urlPre || info.master_url || ''
    );
    if (direct) return direct;
    if (Array.isArray(info.info_list || info.infoList)) {
      var arr = info.info_list || info.infoList;
      for (var i = 0; i < arr.length; i++) {
        var u = normalizeUrl(arr[i] && arr[i].url || '');
        if (u) return u;
      }
    }
    return '';
  }

  function imageUrls(note) {
    if (!note || typeof note !== 'object') return [];
    var list = note.imageList || note.image_list || note.images || [];
    if (!Array.isArray(list)) list = list ? [list] : [];
    var out = list.map(imageFromInfo).filter(Boolean);
    if (!out.length) {
      var cover = imageFromInfo(note.cover || note.image || null);
      if (cover) out.push(cover);
    }
    return uniq(out);
  }

  function collectVideoCandidates(node) {
    var out = [];
    var seen = new WeakSet();
    var stack = [{ value: node, depth: 0 }];
    var visits = 0;

    while (stack.length && visits++ < 5000) {
      var item = stack.pop();
      var value = item.value;
      var depth = item.depth;
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);

      if (!Array.isArray(value)) {
        var u = normalizeUrl(value.master_url || value.masterUrl || value.url || value.play_url || value.playUrl || '');
        if (u) {
          out.push({
            url: u,
            size: Number(value.size || value.file_size || value.fileSize || value.width || 0) || 0,
            preferred: value.master_url || value.masterUrl ? 1 : 0
          });
        }
      }

      if (depth >= 7) continue;
      var children = Array.isArray(value) ? value.slice(0, 80) : Object.values(value).slice(0, 120);
      children.forEach(function (child) {
        if (child && typeof child === 'object') stack.push({ value: child, depth: depth + 1 });
      });
    }

    var map = new Map();
    out.forEach(function (item) {
      var current = map.get(item.url);
      if (!current || item.size > current.size) map.set(item.url, item);
    });
    return Array.from(map.values()).sort(function (a, b) {
      if (b.preferred !== a.preferred) return b.preferred - a.preferred;
      return b.size - a.size;
    });
  }

  function videoUrls(note) {
    if (!note || typeof note !== 'object') return [];
    var video = note.video || note.videoInfo || note.video_info;
    if (!video) return [];
    var items = collectVideoCandidates(video);
    var likely = items.filter(function (item) {
      return /\.mp4(?:\?|$)/i.test(item.url) ||
        /(video|stream|vod|media)/i.test(item.url) ||
        item.preferred;
    });
    var chosen = likely.length ? likely : items;
    return chosen.length ? [chosen[0].url] : [];
  }

  function tagList(note) {
    var raw = note && (
      note.tagList || note.tag_list || note.tags ||
      note.topics || note.bodyTags || note.body_tags
    );
    var out = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (item) {
        var name = clean(
          typeof item === 'string'
            ? item
            : item && (item.name || item.title || item.tagName || item.tag_name) || ''
        ).replace(/^#/, '');
        if (name) out.push(name);
      });
    }
    return uniq(out);
  }

  function stats(note) {
    var info = note && (note.interactInfo || note.interact_info) || {};
    return {
      liked: String(info.likedCount != null ? info.likedCount : (info.liked_count != null ? info.liked_count : '')),
      collected: String(info.collectedCount != null ? info.collectedCount : (info.collected_count != null ? info.collected_count : '')),
      comments: String(info.commentCount != null ? info.commentCount : (info.comment_count != null ? info.comment_count : '')),
      shares: String(info.shareCount != null ? info.shareCount : (info.share_count != null ? info.share_count : ''))
    };
  }

  function structured(note, id) {
    if (!note) return null;
    var user = note.user || note.author || note.userInfo || note.user_info || {};
    return {
      noteId: candidateId(note) || id || '',
      title: clean(note.title || note.displayTitle || note.display_title || ''),
      content: clean(note.desc || note.description || note.content || note.text || ''),
      author: {
        name: clean(user.nickname || user.nickName || user.nick_name || user.name || ''),
        id: String(user.userId != null ? user.userId : (user.user_id != null ? user.user_id : (user.id || '')))
      },
      tags: tagList(note),
      images: imageUrls(note),
      videos: videoUrls(note),
      type: clean(note.type || note.noteType || note.note_type || ''),
      stats: stats(note),
      publishedAt: Number(note.time || note.createTime || note.create_time || 0) || 0,
      updatedAt: Number(note.lastUpdateTime || note.last_update_time || 0) || 0,
      ipLocation: clean(note.ipLocation || note.ip_location || '')
    };
  }

  function textFrom(selectors, root) {
    for (var i = 0; i < selectors.length; i++) {
      var el = q(selectors[i], root);
      var text = clean(el && el.textContent || '');
      if (text && text.length < 8000) return text;
    }
    return '';
  }

  function detailScope() {
    return q('#noteContainer') ||
      q('.note-detail-mask') ||
      q('[class*="note-detail"]') ||
      q('[class*="noteDetail"]') ||
      document;
  }

  function domFallback() {
    var scope = detailScope();
    var title = textFrom(['#detail-title', '.note-content .title', '[class*="title"]', 'h1'], scope) ||
      meta('og:title', true) || clean(document.title);
    title = title.replace(/\s*[-_|]\s*小红书.*$/i, '').trim();

    var content = textFrom(['#detail-desc', '.note-content .desc', '.note-content [class*="desc"]', '[class*="desc"]'], scope) ||
      meta('og:description', true) || meta('description');

    var authorEl = q('.author-container .username', scope) ||
      q('.author-wrapper .username', scope) ||
      q('a[href*="/user/profile/"]', scope);
    var href = '';
    if (authorEl) {
      var anchor = authorEl.closest && authorEl.closest('a');
      href = anchor && anchor.href || authorEl.href || '';
    }
    var authorMatch = href.match(/\/user\/profile\/([^/?#]+)/);

    var tags = uniq(
      qa('a[href*="search_result"],a[href*="keyword"],a[href*="topic"]', scope)
        .map(function (el) { return clean(el.textContent).replace(/^#/, ''); })
        .filter(function (x) { return x && x.length <= 50; })
    );
    if (!tags.length && content) {
      var found = content.match(/#[^#\s]{1,30}/g) || [];
      tags = uniq(found.map(function (x) { return x.slice(1); }));
    }

    var images = [];
    var ogImage = meta('og:image', true);
    if (ogImage) images.push(ogImage);

    qa('img', scope).forEach(function (img) {
      var url = normalizeUrl(img.currentSrc || img.src || img.getAttribute('data-src') || '');
      var box = img.getBoundingClientRect ? img.getBoundingClientRect() : { width: 0, height: 0 };
      var wideEnough = img.naturalWidth >= 500 || box.width >= 220 || box.height >= 260;
      if (url && /(xhscdn|xhsimg)\.com/i.test(url) && wideEnough) images.push(url);
    });

    var videos = [];
    var ogVideo = meta('og:video', true) || meta('og:video:url', true);
    if (ogVideo) videos.push(ogVideo);
    qa('video,video source', scope).forEach(function (el) {
      var url = normalizeUrl(el.currentSrc || el.src || el.getAttribute('src') || '');
      if (url) videos.push(url);
    });

    return {
      title: title,
      content: content,
      author: {
        name: clean(authorEl && authorEl.textContent || ''),
        id: authorMatch ? authorMatch[1] : ''
      },
      tags: tags,
      images: uniq(images),
      videos: uniq(videos)
    };
  }

  function extract() {
    var id = noteId();
    var best = null;
    var bestWeight = -1;

    roots().forEach(function (root) {
      var note = bestNote(root, id);
      if (!note) return;
      var result = structured(note, id);
      var weight = (result.images || []).length * 3 +
        (result.videos || []).length * 4 +
        (result.content ? 2 : 0) +
        (result.title ? 1 : 0);
      if (weight > bestWeight) {
        best = result;
        bestWeight = weight;
      }
    });

    var dom = domFallback();
    var p = best || {};
    var images = p.images && p.images.length ? p.images : dom.images;
    var videos = p.videos && p.videos.length ? p.videos : dom.videos;
    var content = p.content || dom.content || '';
    var tags = p.tags && p.tags.length ? p.tags : dom.tags;
    if (!tags.length && content) {
      tags = uniq((content.match(/#[^#\s]{1,30}/g) || []).map(function (x) { return x.slice(1); }));
    }

    var readyScore = (p.title || dom.title ? 1 : 0) +
      (content ? 1 : 0) +
      (images.length || videos.length ? 1 : 0);

    return {
      platform: 'xiaohongshu',
      version: VERSION,
      status: !id ? 'not-note-page' : (readyScore >= 2 ? 'ready' : 'partial'),
      url: location.href,
      noteId: p.noteId || id || '',
      title: p.title || dom.title || '',
      content: content,
      author: {
        name: p.author && p.author.name || dom.author.name || '',
        id: p.author && p.author.id || dom.author.id || ''
      },
      tags: uniq(tags || []),
      images: uniq(images || []),
      videos: uniq(videos || []),
      type: p.type || (videos.length ? 'video' : 'image'),
      stats: p.stats || { liked: '', collected: '', comments: '', shares: '' },
      publishedAt: p.publishedAt || 0,
      updatedAt: p.updatedAt || 0,
      ipLocation: p.ipLocation || '',
      extractedAt: new Date().toISOString()
    };
  }

  function shadowRoot() {
    var host = document.getElementById(HOST_ID);
    return host && host.shadowRoot;
  }

  function safeName(value) {
    return (String(value || 'xiaohongshu')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\.+$/g, '')
      .trim() || 'xiaohongshu').slice(0, 70);
  }

  function fileExt(url, fallback) {
    try {
      var m = new URL(url).pathname.match(/\.(jpe?g|png|webp|avif|gif|mp4|mov|m4v)$/i);
      return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function toast(message) {
    var root = shadowRoot();
    var el = root && root.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1700);
  }

  function copyText(value) {
    var text = String(value || '');
    if (!text) {
      toast('没有可复制的内容');
      return;
    }
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        toast('已复制');
        return;
      }
    } catch (_) {}
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('已复制');
      }).catch(function () {
        toast('复制失败');
      });
    } else {
      toast('复制失败');
    }
  }

  function openUrl(url) {
    try {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.documentElement.appendChild(a);
      a.click();
      a.remove();
    } catch (_) {
      location.href = url;
    }
  }

  function blobDownload(url, filename) {
    if (typeof GM_xmlhttpRequest !== 'function') {
      openUrl(url);
      return;
    }
    GM_xmlhttpRequest({
      method: 'GET',
      url: url,
      responseType: 'blob',
      timeout: 45000,
      onload: function (response) {
        try {
          var blob = response.response instanceof Blob ? response.response : new Blob([response.response]);
          var objectUrl = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          document.documentElement.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 3000);
        } catch (_) {
          openUrl(url);
        }
      },
      onerror: function () { openUrl(url); },
      ontimeout: function () { openUrl(url); }
    });
  }

  function downloadOne(url, filename) {
    if (!url) return;
    try {
      if (typeof GM_download === 'function') {
        GM_download({
          url: url,
          name: filename,
          saveAs: false,
          onerror: function () { blobDownload(url, filename); }
        });
        return;
      }
    } catch (_) {}
    blobDownload(url, filename);
  }

  function currentData() {
    var data = extract();
    updatePanel(data);
    return data;
  }

  function updateHostVisibility() {
    var host = document.getElementById(HOST_ID);
    if (!host) return;
    host.style.display = isNotePage() ? '' : 'none';
  }

  function updatePanel(data) {
    updateHostVisibility();
    var root = shadowRoot();
    if (!root) return;

    var title = root.getElementById('noteTitle');
    var metaLine = root.getElementById('noteMeta');
    var status = root.getElementById('status');

    if (title) title.textContent = data.title || data.noteId || '暂未识别到笔记内容';
    if (metaLine) {
      metaLine.textContent =
        '作者：' + (data.author && data.author.name || '未知') +
        ' · 图片 ' + (data.images || []).length +
        ' · 视频 ' + (data.videos || []).length;
    }
    if (status) {
      status.textContent = data.status === 'ready'
        ? '已识别'
        : data.status === 'partial'
          ? '部分识别，可点刷新'
          : '请打开具体笔记';
      status.className = 'status ' + (data.status === 'ready' ? 'ok' : 'warn');
    }
  }

  function downloadImages() {
    var data = currentData();
    var base = safeName(data.title || data.noteId);
    if (!data.images.length) {
      toast('没有识别到图片');
      return;
    }
    data.images.forEach(function (url, index) {
      setTimeout(function () {
        downloadOne(url, base + '-' + String(index + 1).padStart(2, '0') + fileExt(url, '.jpg'));
      }, index * 650);
    });
    toast('开始下载 ' + data.images.length + ' 张图片');
  }

  function downloadVideos() {
    var data = currentData();
    var base = safeName(data.title || data.noteId);
    if (!data.videos.length) {
      toast('没有识别到视频');
      return;
    }
    data.videos.forEach(function (url, index) {
      setTimeout(function () {
        var suffix = data.videos.length > 1 ? '-' + (index + 1) : '';
        downloadOne(url, base + suffix + fileExt(url, '.mp4'));
      }, index * 800);
    });
    toast('开始下载 ' + data.videos.length + ' 个视频');
  }

  function ensureUi() {
    if (document.getElementById(HOST_ID)) return;

    var host = document.createElement('div');
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
    var root = host.attachShadow({ mode: 'open' });

    root.innerHTML =
      '<style>' +
      ':host{all:initial}*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
      '.fab{position:fixed;right:14px;bottom:calc(22px + env(safe-area-inset-bottom));z-index:2147483647;width:58px;height:58px;border:0;border-radius:19px;background:#111827;color:#fff;font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 34px #0005}' +
      '.panel{display:none;position:fixed;z-index:2147483647;right:12px;bottom:calc(92px + env(safe-area-inset-bottom));width:min(380px,calc(100vw - 24px));max-height:min(640px,calc(100vh - 120px));overflow:auto;overscroll-behavior:contain;background:#fffffff7;color:#111827;border:1px solid #0001;border-radius:20px;box-shadow:0 18px 60px #0005;padding:14px;font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(16px)}' +
      '.panel.open{display:block}.head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.head b{font-size:16px}.version{font-size:11px;color:#6b7280}' +
      '.summary{padding:11px;border-radius:13px;background:#f3f4f6;margin-bottom:8px;word-break:break-word}.summary b{display:block;margin-bottom:5px}.meta{font-size:12px;color:#6b7280}' +
      '.status{font-size:12px;margin:7px 2px 10px;color:#9a3412}.status.ok{color:#047857}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.btn{min-height:44px;padding:9px;border:0;border-radius:12px;background:#111827;color:#fff;font:700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.btn.light{background:#eef2f7;color:#111827}' +
      'pre{display:none;white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;background:#0b1020;color:#dbeafe;border-radius:12px;padding:10px;font-size:11px;margin:10px 0 0}pre.open{display:block}' +
      '.toast{position:fixed;right:16px;bottom:calc(160px + env(safe-area-inset-bottom));z-index:2147483647;background:#111827;color:#fff;border-radius:11px;padding:9px 12px;opacity:0;pointer-events:none;transform:translateY(5px);transition:.18s}.toast.show{opacity:1;transform:none}' +
      '@media(max-width:600px){.panel{left:8px;right:8px;bottom:calc(88px + env(safe-area-inset-bottom));width:auto;max-height:68vh;border-radius:20px}.fab{right:14px}.btn{min-height:46px;font-size:14px}.toast{left:50%;right:auto;transform:translate(-50%,5px);white-space:nowrap}.toast.show{transform:translate(-50%,0)}}' +
      '</style>' +
      '<button class="fab" id="toggle">素材</button>' +
      '<section class="panel" id="panel">' +
      '<div class="head"><b>ZWM 社媒助手 Lite</b><span class="version">v' + VERSION + '</span></div>' +
      '<div class="summary"><b id="noteTitle">等待识别当前笔记…</b><div class="meta" id="noteMeta"></div></div>' +
      '<div class="status warn" id="status">正在识别</div>' +
      '<div class="grid">' +
      '<button class="btn" data-action="json">复制 JSON</button>' +
      '<button class="btn" data-action="text">复制正文</button>' +
      '<button class="btn light" data-action="images-link">复制图片链接</button>' +
      '<button class="btn light" data-action="videos-link">复制视频链接</button>' +
      '<button class="btn" data-action="images">下载图片</button>' +
      '<button class="btn" data-action="videos">下载视频</button>' +
      '<button class="btn light" data-action="media-link">复制全部媒体</button>' +
      '<button class="btn light" data-action="refresh">重新识别</button>' +
      '<button class="btn light" data-action="preview">查看数据</button>' +
      '<button class="btn light" data-action="close">关闭面板</button>' +
      '</div><pre id="preview"></pre></section>' +
      '<div class="toast" id="toast"></div>';

    var panel = root.getElementById('panel');
    root.getElementById('toggle').onclick = function () {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) currentData();
    };

    root.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-action]');
      if (!button) return;
      var action = button.dataset.action;
      var data = currentData();

      if (action === 'json') copyText(JSON.stringify(data, null, 2));
      if (action === 'text') copyText(data.content);
      if (action === 'images-link') copyText(data.images.join('\n'));
      if (action === 'videos-link') copyText(data.videos.join('\n'));
      if (action === 'media-link') copyText([].concat(data.images, data.videos).join('\n'));
      if (action === 'images') downloadImages();
      if (action === 'videos') downloadVideos();
      if (action === 'refresh') {
        schedule(50);
        toast('已重新识别');
      }
      if (action === 'preview') {
        var pre = root.getElementById('preview');
        pre.textContent = JSON.stringify(data, null, 2);
        pre.classList.toggle('open');
      }
      if (action === 'close') panel.classList.remove('open');
    });

    updateHostVisibility();
  }

  function schedule(delay) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      lastUrl = location.href;
      currentData();
    }, delay == null ? 500 : delay);
  }

  function patchSpaNavigation() {
    var fire = function () {
      window.dispatchEvent(new CustomEvent('zwm:locationchange'));
    };

    ['pushState', 'replaceState'].forEach(function (name) {
      var original = history[name];
      if (!original || original.__zwmWrapped) return;
      var wrapped = function () {
        var result = original.apply(this, arguments);
        fire();
        return result;
      };
      wrapped.__zwmWrapped = true;
      history[name] = wrapped;
    });

    window.addEventListener('popstate', fire);
    window.addEventListener('zwm:locationchange', function () {
      updateHostVisibility();
      schedule(650);
      setTimeout(function () { schedule(0); }, 1800);
    });
  }

  function observePage() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function () {
      if (location.href !== lastUrl) {
        updateHostVisibility();
        schedule(650);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function registerMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand('复制当前笔记 JSON', function () {
      copyText(JSON.stringify(currentData(), null, 2));
    });
    GM_registerMenuCommand('复制当前笔记正文', function () {
      copyText(currentData().content);
    });
    GM_registerMenuCommand('复制全部媒体链接', function () {
      var d = currentData();
      copyText([].concat(d.images, d.videos).join('\n'));
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    ensureUi();
    patchSpaNavigation();
    observePage();
    registerMenu();
    schedule(450);
    setTimeout(function () { schedule(0); }, 1500);
    setTimeout(function () { schedule(0); }, 3500);
    console.info('[ZWM 社媒助手 Lite] loaded v' + VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
