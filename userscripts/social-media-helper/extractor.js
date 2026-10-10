(function (G) {
  'use strict';
  var A = G.ZWMSH = G.ZWMSH || {};
  var PAGE = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  var clean = function (v) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''; };
  var uniq = function (a) { return Array.from(new Set((a || []).filter(Boolean))); };
  var http = function (v) { return typeof v === 'string' && /^https?:\/\//i.test(v); };
  var norm = function (v) {
    if (!v || typeof v !== 'string') return '';
    if (v.indexOf('//') === 0) return 'https:' + v;
    return v.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
  };

  A.noteId = function () {
    var u = location.href, m;
    var rs = [/\/explore\/([\w-]+)/, /\/discovery\/item\/([\w-]+)/, /\/note\/([\w-]+)/];
    for (var i = 0; i < rs.length; i++) { m = u.match(rs[i]); if (m) return m[1]; }
    try { return new URL(u).searchParams.get('note_id') || ''; } catch (_) { return ''; }
  };

  function meta(name, prop) {
    var e = q('meta[' + (prop ? 'property' : 'name') + '="' + name + '"]');
    return clean(e && e.content || '');
  }

  function unwrap(o) {
    return o && typeof o === 'object' ? (o.noteCard || o.note_card || o.note || o.noteDetail || o.note_detail || o) : o;
  }

  function score(o, id) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return -1;
    var oid = String(o.noteId != null ? o.noteId : (o.note_id != null ? o.note_id : (o.id || '')));
    var s = id && oid === id ? 12 : 0;
    if (o.title || o.displayTitle || o.display_title) s += 2;
    if (o.desc || o.description || o.content) s += 2;
    if (o.user || o.author) s += 2;
    if (o.imageList || o.image_list || o.images) s += 4;
    if (o.video || o.videoInfo || o.video_info) s += 3;
    return s;
  }

  function best(root, id) {
    if (!root || typeof root !== 'object') return null;
    var seen = new WeakSet(), stack = [{v: root, d: 0}], hit = null, hitScore = -1, visits = 0;
    while (stack.length && visits++ < 22000) {
      var n = stack.pop(), v = n.v, d = n.d;
      if (!v || typeof v !== 'object' || seen.has(v)) continue;
      seen.add(v);
      var u = unwrap(v), sc = score(u, id);
      if (sc > hitScore) { hitScore = sc; hit = u; }
      if (d >= 9) continue;
      var kids = Array.isArray(v) ? v.slice(0, 120) : Object.values(v).slice(0, 180);
      for (var i = kids.length - 1; i >= 0; i--) if (kids[i] && typeof kids[i] === 'object') stack.push({v: kids[i], d: d + 1});
    }
    return hitScore >= 5 ? hit : null;
  }

  function roots() {
    var out = [], keys = ['__INITIAL_STATE__', '__INITIAL_SSR_STATE__', '__NEXT_DATA__', '__NUXT__'];
    keys.forEach(function (k) { try { if (PAGE && PAGE[k] && typeof PAGE[k] === 'object') out.push(PAGE[k]); } catch (_) {} });
    qa('script[type="application/json"]').forEach(function (s) { try { out.push(JSON.parse(s.textContent)); } catch (_) {} });
    return out;
  }

  function urls(node) {
    var out = [], seen = new WeakSet(), stack = [{v: node, d: 0}];
    while (stack.length && out.length < 260) {
      var n = stack.pop(), v = n.v, d = n.d;
      if (typeof v === 'string') { var u = norm(v); if (http(u)) out.push(u); continue; }
      if (!v || typeof v !== 'object' || seen.has(v) || d > 7) continue;
      seen.add(v);
      var kids = Array.isArray(v) ? v.slice(0, 120) : Object.values(v).slice(0, 180);
      kids.forEach(function (x) { stack.push({v: x, d: d + 1}); });
    }
    return uniq(out);
  }

  function media(note) {
    var imgs = urls(note && (note.imageList || note.image_list || note.images || note.cover));
    var vids = urls(note && (note.video || note.videoInfo || note.video_info));
    imgs = imgs.filter(function (u) { return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) || /(xhscdn|xhsimg)\.com/i.test(u); });
    vids = vids.filter(function (u) { return /\.mp4(\?|$)/i.test(u) || /(video|stream|media).*(xhscdn|xhsimg)\.com/i.test(u); });
    return {images: uniq(imgs), videos: uniq(vids)};
  }

  function tags(note) {
    var a = note && (note.tagList || note.tag_list || note.tags || note.topics || note.bodyTags || note.body_tags), out = [];
    if (Array.isArray(a)) a.forEach(function (t) {
      var n = clean(typeof t === 'string' ? t : t && (t.name || t.title || t.tagName || t.tag_name) || '');
      if (n) out.push(n.replace(/^#/, ''));
    });
    return uniq(out);
  }

  function structured(note, id) {
    if (!note) return {};
    var user = note.user || note.author || note.userInfo || note.user_info || {}, m = media(note);
    return {
      noteId: String(note.noteId != null ? note.noteId : (note.note_id != null ? note.note_id : (note.id || id || ''))),
      title: clean(note.title || note.displayTitle || note.display_title || ''),
      content: clean(note.desc || note.description || note.content || note.text || ''),
      author: {name: clean(user.nickname || user.nickName || user.nick_name || user.name || ''), id: String(user.userId != null ? user.userId : (user.user_id != null ? user.user_id : (user.id || '')))},
      tags: tags(note), images: m.images, videos: m.videos,
      type: clean(note.type || note.noteType || note.note_type || '')
    };
  }

  function dom() {
    function text(ss) { for (var i = 0; i < ss.length; i++) { var e = q(ss[i]), t = clean(e && e.textContent || ''); if (t && t.length < 5000) return t; } return ''; }
    var title = text(['#detail-title', '.note-content .title', 'h1']) || meta('og:title', true) || clean(document.title);
    title = title.replace(/\s*[-_|]\s*小红书.*$/i, '').trim();
    var content = text(['#detail-desc', '.note-content .desc', '.note-content [class*="desc"]']) || meta('og:description', true) || meta('description');
    var ae = q('.author-container .username') || q('.author-wrapper .username') || q('a[href*="/user/profile/"]');
    var href = ae && (ae.closest && ae.closest('a') && ae.closest('a').href || ae.href) || '', am = href.match(/\/user\/profile\/([^/?#]+)/);
    var ts = uniq(qa('a[href*="search_result"],a[href*="keyword"],a[href*="topic"]').map(function (e) { return clean(e.textContent).replace(/^#/, ''); }).filter(function (x) { return x && x.length <= 50; }));
    var imgs = [], ogi = meta('og:image', true); if (ogi) imgs.push(ogi);
    qa('img').forEach(function (im) { var u = norm(im.currentSrc || im.src || im.getAttribute('data-src') || ''); if (http(u) && /(xhscdn|xhsimg)\.com/i.test(u) && (im.naturalWidth >= 480 || (im.getBoundingClientRect && im.getBoundingClientRect().width >= 180))) imgs.push(u); });
    var vids = [], ogv = meta('og:video', true) || meta('og:video:url', true); if (ogv) vids.push(ogv);
    qa('video,video source').forEach(function (v) { var u = norm(v.currentSrc || v.src || v.getAttribute('src') || ''); if (http(u)) vids.push(u); });
    return {title: title, content: content, author: {name: clean(ae && ae.textContent || ''), id: am ? am[1] : ''}, tags: ts, images: uniq(imgs), videos: uniq(vids)};
  }

  A.extract = function () {
    var id = A.noteId(), p = null;
    roots().forEach(function (r) {
      var n = best(r, id), s = structured(n, id);
      if (!n) return;
      var w = (s.images || []).length + (s.videos || []).length + (s.content ? 2 : 0);
      var pw = p ? p.images.length + p.videos.length + (p.content ? 2 : 0) : -1;
      if (w > pw) p = s;
    });
    var f = dom(), pa = p || {};
    return {
      platform: 'xiaohongshu', url: location.href, noteId: pa.noteId || id || '',
      title: pa.title || f.title || '', content: pa.content || f.content || '',
      author: {name: pa.author && pa.author.name || f.author.name || '', id: pa.author && pa.author.id || f.author.id || ''},
      tags: uniq([].concat(pa.tags || [], f.tags || [])), images: uniq([].concat(pa.images || [], f.images || [])), videos: uniq([].concat(pa.videos || [], f.videos || [])),
      type: pa.type || ((pa.videos && pa.videos.length) || f.videos.length ? 'video' : 'image'), extractedAt: new Date().toISOString()
    };
  };
})(globalThis);
