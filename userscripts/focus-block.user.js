// ==UserScript==
// @name         全网净化与拦截助手-在线更新版
// @namespace    http://tampermonkey.net/
// @version      4.1.1
// @description  域名拦截+页面关键词检测+动态页面监控+精准匹配防误伤
// @author       zwmopen / Gemini Partner
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// @noframes
// @updateURL    https://zwmopen.github.io/userscripts/focus-block.user.js
// @downloadURL  https://zwmopen.github.io/userscripts/focus-block.user.js
// ==/UserScript==

(function() {
    'use strict';

    const DOMAIN_STORAGE_KEY = 'block_domain_list_v4';
    const KEYWORD_STORAGE_KEY = 'block_keyword_list_v4_1';
    const KEYWORD_ALLOWLIST_KEY = 'keyword_allow_domain_list_v4_1';

    // 这里保留你原来的完整域名黑名单。
    const DEFAULT_BLACKLIST = [
        "yangdex.com", "mrfldh.com", "baozougif.com", "mmz.moe", "tom.ynydsm.com", "m.wmtxt.com",
        "m.changdusk.com", "sosadfun.net", "m.rmxs8.com", "wap.bxshuku.com",
        "m.fashuwx.com", "xiaomixiaoshuo.com", "pornhub", "1024z.cc", "phncdn.com",
        "p.eikuaitao.com", "m2.ddbiquge.cc", "m.wrshuw.com", "m.xuankuks.com",
        "m.xtxt99.com", "wap.baimoge.com", "img.ypqrgim.cn", "sydswxx.com",
        "dibaqu123.com", "wap.ddsge.com", "m.ucwxs.com", "m.ddshubao.cc",
        "m.heiyan.la", "ysiqmzfr.eileader.cn", "jj.shzpkc.cn", "hongqiao668.com",
        "lingyun-chain.com", "m.qududu.cc", "m.zaohuatu.com", "tesexiaoshuo.com",
        "xwbiquge.cc", "minguoqiren.info", "xvideos", "porn", "91short",
        "nineonebuf", "2xmzazd.cn", "nineone", "faloo.com", "aabqg520.com",
        "bstatic.pgpfp.com", "shushudu.com", "182135.com", "yandex.com",
        "mohvxrvd.xyz", "maihuo.org", "utezxmpb.xyz", "heiliao", "glb112.cc",
        "toutiaocc.com", "dqhevnpya9a75", "wvwvon.com", "lldh5.buzz", "lldh.top",
        "88ghl.live", "yxz2.huainani.cn", "gs5.fun", "ilebjy.com", "hlcg1.com",
        "obifixjub.tips", "jxz4k8.com", "hlsxzz.com", "911blw.net", "zpixtngk.xyz",
        "8ghl.me", "abh2g.cc", "pic.jfcskx.cn", "ibdy33.com", "3x5usfan.tips",
        "a1x.net", "mshu8.com", "biqge6.cc", "qishuta.org", "wap.bishige.com",
        "bqyd.cc", "91-av.com", "st10.gs2.fun", "yuzhaiw.cc", "biquge365.net",
        "m.cuhebook.com", "kanunu.info", "m.okbiq.com", "m.qidian.com",
        "sxxs.cc", "m.qidiansk.com", "m.dswang.org", "babynovel.com", "gua04.fun",
        "lyspzc.com.cn", "811765.com", "biqukan.co", "lxjhigzgg.com", "cgw10.cc",
        "hllrweg.2024ents.life", "tumblr.com", "52cg1.fit", "mrds1.life",
        "renqixiaoshuo.net", "zmhxs.com", "qozdwvjr.com", "dingdian666.com",
        "aixuwens.com", "fxxs2.com", "nongcunxsw.cc", "diyishu.cc", "51baoliao01.com",
        "hlw04.cc", "uukojlk.com", "cmdseacf.com", "nj1ssyiu.net", "ggxtnua.org",
        "smzaspg.org", "zvecvgl.com", "m.hbpas.org", "zrhvwdpq.com", "bi53.cc",
        "51cg1.com", "mshu88.com", "aguxs.com", "bxrwdyrb.com", "199833.xyz",
        "jrgtil.com", "m.ltxs520.net", "huangsexiaoshuo.net", "m.nilxs.com",
        "erifeng.com", "gugexs.com", "dubmmdpw.com", "aaccnn.com", "dmdbjywe.com",
        "mrds66.com", "doublejoy.cyou", "putaoks.com", "feifanks.com", "renqixiaoshuo.net",
        "n.cn", "shenmuxsw.cc", "qqdrjkjx.cc", "ihlw35.com", "tantanread.com",
        "nf8hlbk.com", "hlbk11.com", "lsxs.org", "hl23.co", "ranwennovel.com",
        "51bl3.me", "cloudfront.net", "jpbqg6.com", "cgw321.com", "w2.sn11a.cc",
        "juemm3.top", "mvll8.cc", "91blc.com", "fshlkq.jpds3.makeup", "ifxqgc.flsp2.homes",
        "eld.aavv9.com", "nvhai13.top", "mmzx12.cc", "lds15.cc"
    ];

    // 可直接在这里写默认关键词；也可以通过油猴菜单动态添加。
    // 建议使用较具体的词组，避免只写“性”“小说”等过短词语造成误拦。
    const DEFAULT_KEYWORDS = [
        // '成人视频',
        // '色情小说',
        // '你想拦截的完整关键词'
    ];

    // 这些域名仍受“域名黑名单”约束，但不进行“页面关键词”检测。
    const DEFAULT_KEYWORD_ALLOWLIST = [];

    const CONFIG = {
        cleanRules: {
            'yinxiang.com': '.sc-jWBwVP, .eBgsec, .sc-cMljjf, .sc-hSdWYo, img[src*="yx-icon@300.png"]',
            'flomoapp.com': '.LaunchAppTop, .LaunchAppBottom',
            'weread.qq.com': '.wr_tabBar_item_App, .wr_tabBar',
            'jianshu.com': '.jianshu-header, img[src*="assets.xiaozuowen.net"], #jianshu-header',
            'zsxq.com': 'app-header > .header-container, footer, .qrcode-container, .enter-group, #header, .user-info',
            'dedao.cn': '.iget-invoke-app-bar, .logo, .update-reminder'
        },
        keywordScan: {
            enabled: true,
            caseSensitive: false,
            scanUrl: true,
            scanTitle: true,
            scanMeta: true,
            scanBody: true,
            debounceMs: 450,
            minIntervalMs: 800,
            maxScannedCharacters: 2000000,
            ignoredSelector: 'script, style, noscript, template, svg, canvas, code, pre, textarea, input, [contenteditable="true"]'
        },
        alertQuotes: [
            '弱者才渴望确定性，强者在羞耻感中开天辟地。',
            '想法不值钱，执行力才值钱。',
            '你可以在互联网上学到任何东西，前提是你真的去学了。',
            '不要看了那几分钟，就当自己会了。',
            '君子应处木雁之间，当有龙蛇之变。',
            '强者在挫折里蓄力，弱者在确定里沉沦。',
            '停下，去做那件你一直逃避的事。',
            '我现在能不能先做一个替代动作，十分钟后再决定？',
            '这是可控刺激，还是我一碰就容易失控的东西？',
            '不让一次滑坡变成整晚失控，不让整晚失控变成连续几天。',
            '浏览的快乐是暂时的，把事做成的成就感才是长久的。',
            '现在偷的懒，都会变成日后焦虑的根源；<strong>关掉它，行动才是解药。</strong>',
            '你的时间很贵，别浪费在让你堕落的网页上；<strong>要么做，要么滚去做。</strong>',
            '你在小说和欲望里浪费的每一分钟，都是在给未来的焦虑铺路。',
            '屏蔽无用诱惑是顶级自律，先完成再完美是务实智慧。',
            '放纵的快感只有几秒，完成目标的底气却能撑很久。'
        ]
    };

    function uniqueStrings(list) {
        return [...new Set((Array.isArray(list) ? list : [])
            .map(item => String(item).trim())
            .filter(Boolean))];
    }

    function loadMergedList(key, defaults) {
        const stored = GM_getValue(key, []);
        return uniqueStrings([...defaults, ...(Array.isArray(stored) ? stored : [])]);
    }

    let blackList = loadMergedList(DOMAIN_STORAGE_KEY, DEFAULT_BLACKLIST);
    let keywordList = loadMergedList(KEYWORD_STORAGE_KEY, DEFAULT_KEYWORDS);
    let keywordAllowList = loadMergedList(KEYWORD_ALLOWLIST_KEY, DEFAULT_KEYWORD_ALLOWLIST);

    let blocked = false;
    let pageObserver = null;
    let detectionTimer = null;
    let urlWatcher = null;
    let lastDetectionAt = 0;
    let lastUrl = location.href;

    function saveDomains() {
        blackList = uniqueStrings(blackList);
        GM_setValue(DOMAIN_STORAGE_KEY, blackList);
    }

    function saveKeywords() {
        keywordList = uniqueStrings(keywordList);
        GM_setValue(KEYWORD_STORAGE_KEY, keywordList);
    }

    function saveKeywordAllowList() {
        keywordAllowList = uniqueStrings(keywordAllowList);
        GM_setValue(KEYWORD_ALLOWLIST_KEY, keywordAllowList);
    }

    function normalizeForMatch(value) {
        let text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!CONFIG.keywordScan.caseSensitive) text = text.toLowerCase();
        return text;
    }

    function domainMatches(host, rule) {
        const normalizedHost = String(host || '').toLowerCase();
        const normalizedRule = String(rule || '')
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0]
            .trim();

        if (!normalizedRule) return false;

        // 有点号：按完整域名或子域名匹配。
        if (normalizedRule.includes('.')) {
            return normalizedHost === normalizedRule || normalizedHost.endsWith('.' + normalizedRule);
        }

        // 没有点号：按主机名关键词匹配。
        // 这样原列表里的 pornhub、xvideos、nineone 等规则才真正有效。
        return normalizedHost.includes(normalizedRule);
    }

    function isDomainBlacklisted() {
        const host = location.hostname;
        return blackList.some(rule => domainMatches(host, rule));
    }

    function isKeywordScanAllowed() {
        const host = location.hostname;
        return !keywordAllowList.some(rule => domainMatches(host, rule));
    }

    function getKeywordEntries() {
        return uniqueStrings(keywordList).map(original => ({
            original,
            needle: normalizeForMatch(original)
        })).filter(item => item.needle);
    }

    function findKeywordInString(text, source) {
        if (!text || keywordList.length === 0) return null;
        const haystack = normalizeForMatch(text);
        if (!haystack) return null;

        for (const item of getKeywordEntries()) {
            if (haystack.includes(item.needle)) {
                return {
                    type: 'keyword',
                    keyword: item.original,
                    source
                };
            }
        }
        return null;
    }

    function detectKeywordInStaticFields() {
        if (!CONFIG.keywordScan.enabled || !isKeywordScanAllowed() || keywordList.length === 0) {
            return null;
        }

        let hit = null;

        if (CONFIG.keywordScan.scanUrl) {
            hit = findKeywordInString(location.href, '网页地址');
            if (hit) return hit;
        }

        if (CONFIG.keywordScan.scanTitle) {
            hit = findKeywordInString(document.title, '网页标题');
            if (hit) return hit;
        }

        if (CONFIG.keywordScan.scanMeta && document.documentElement) {
            const metaText = [...document.querySelectorAll(
                'meta[name="description"], meta[name="keywords"], meta[property="og:title"], meta[property="og:description"]'
            )].map(el => el.getAttribute('content') || '').join(' ');

            hit = findKeywordInString(metaText, '网页描述');
            if (hit) return hit;
        }

        return null;
    }

    function isIgnoredTextNode(node) {
        const parent = node && node.parentElement;
        return !parent || Boolean(parent.closest(CONFIG.keywordScan.ignoredSelector));
    }

    function detectKeywordInBody() {
        if (!CONFIG.keywordScan.enabled ||
            !CONFIG.keywordScan.scanBody ||
            !isKeywordScanAllowed() ||
            keywordList.length === 0 ||
            !document.body) {
            return null;
        }

        const entries = getKeywordEntries();
        if (entries.length === 0) return null;

        const maxKeywordLength = Math.max(...entries.map(item => item.needle.length), 1);
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (isIgnoredTextNode(node)) return NodeFilter.FILTER_REJECT;
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let scannedCharacters = 0;
        let tail = '';
        let node;

        while ((node = walker.nextNode())) {
            const rawText = node.nodeValue || '';
            scannedCharacters += rawText.length;

            const chunk = normalizeForMatch(tail + ' ' + rawText);
            for (const item of entries) {
                if (chunk.includes(item.needle)) {
                    return {
                        type: 'keyword',
                        keyword: item.original,
                        source: '页面正文'
                    };
                }
            }

            tail = chunk.slice(-(maxKeywordLength + 20));

            if (scannedCharacters >= CONFIG.keywordScan.maxScannedCharacters) {
                break;
            }
        }

        return null;
    }

    function detectBlockedReason() {
        if (isDomainBlacklisted()) {
            return {
                type: 'domain',
                domain: location.hostname,
                source: '域名黑名单'
            };
        }

        return detectKeywordInStaticFields() || detectKeywordInBody();
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderBlockPage(reason) {
        if (blocked) return;
        blocked = true;

        window.stop();
        if (pageObserver) pageObserver.disconnect();
        if (detectionTimer) clearTimeout(detectionTimer);
        if (urlWatcher) clearInterval(urlWatcher);

        const quote = CONFIG.alertQuotes[Math.floor(Math.random() * CONFIG.alertQuotes.length)];
        const reasonText = reason.type === 'keyword'
            ? `检测到关键词「${escapeHtml(reason.keyword)}」 · ${escapeHtml(reason.source)}`
            : `已拦截域名：${escapeHtml(reason.domain)}`;

        const html = `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>专注</title>
    <style>
        html, body {
            background: #e0e5ec !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            overflow: hidden !important;
        }
        * { box-sizing: border-box; }
        .container {
            min-height: 100vh;
            padding: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        }
        .card {
            width: min(760px, 92vw);
            padding: 42px 36px;
            border-radius: 30px;
            background: #e0e5ec;
            box-shadow: 20px 20px 60px #bec3c9, -20px -20px 60px #ffffff;
            text-align: center;
        }
        .text {
            font-size: clamp(22px, 4vw, 34px);
            color: #313b48;
            line-height: 1.65;
            margin-bottom: 20px;
        }
        .text strong { color: #e53e3e; }
        .timer {
            font-weight: 700;
            color: #e53e3e;
            font-size: 20px;
        }
        .reason {
            margin-top: 18px;
            color: #7b8794;
            font-size: 13px;
            line-height: 1.5;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="text" id="quote">${quote}</div>
            <div class="timer"><span id="cd">10</span>s</div>
            <div class="reason">${reasonText}</div>
        </div>
    </div>
</body>
</html>`;

        try {
            document.open();
            document.write(html);
            document.close();
        } catch (error) {
            if (document.documentElement) {
                document.documentElement.innerHTML = html;
            }
        }

        let count = 10;
        setInterval(() => {
            count -= 1;
            const cdEl = document.getElementById('cd');
            const quoteEl = document.getElementById('quote');

            if (cdEl) cdEl.textContent = String(Math.max(count, 0));
            if (count <= 0) {
                count = 10;
                if (quoteEl) {
                    quoteEl.innerHTML = CONFIG.alertQuotes[
                        Math.floor(Math.random() * CONFIG.alertQuotes.length)
                    ];
                }
            }
        }, 1000);
    }

    function applyCleanRules() {
        const host = location.hostname;
        for (const [key, css] of Object.entries(CONFIG.cleanRules)) {
            if (host === key || host.endsWith('.' + key)) {
                GM_addStyle(`${css} { display: none !important; }`);
            }
        }
    }

    function runDetection() {
        if (blocked) return;
        lastDetectionAt = Date.now();

        const reason = detectBlockedReason();
        if (reason) renderBlockPage(reason);
    }

    function scheduleDetection(delay = CONFIG.keywordScan.debounceMs) {
        if (blocked) return;
        if (detectionTimer) clearTimeout(detectionTimer);

        const elapsed = Date.now() - lastDetectionAt;
        const wait = Math.max(delay, CONFIG.keywordScan.minIntervalMs - elapsed, 0);
        detectionTimer = setTimeout(runDetection, wait);
    }

    function startDynamicMonitoring() {
        const attachObserver = () => {
            if (blocked || !document.documentElement) return;

            pageObserver = new MutationObserver(() => {
                scheduleDetection();
            });

            pageObserver.observe(document.documentElement, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['content']
            });
        };

        if (document.documentElement) {
            attachObserver();
        } else {
            const rootTimer = setInterval(() => {
                if (document.documentElement) {
                    clearInterval(rootTimer);
                    attachObserver();
                }
            }, 25);
        }

        urlWatcher = setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                scheduleDetection(0);
            }
        }, 700);
    }

    // ========== 菜单功能 ==========
    GM_registerMenuCommand('📌 拦截当前域名', () => {
        const host = location.hostname;
        if (!blackList.some(rule => rule.toLowerCase() === host.toLowerCase())) {
            blackList.push(host);
            saveDomains();
        }
        location.reload();
    });

    GM_registerMenuCommand('🔤 添加拦截关键词', () => {
        const input = prompt('输入要拦截的关键词或完整短语：\n建议不要使用过短、过于常见的词。');
        const keyword = String(input || '').trim();
        if (!keyword) return;

        const normalized = normalizeForMatch(keyword);
        const exists = keywordList.some(item => normalizeForMatch(item) === normalized);
        if (!exists) {
            keywordList.push(keyword);
            saveKeywords();
            alert(`已添加关键词：${keyword}`);
            scheduleDetection(0);
        } else {
            alert('这个关键词已经存在。');
        }
    });

    GM_registerMenuCommand('➖ 删除拦截关键词', () => {
        if (keywordList.length === 0) {
            alert('当前没有关键词规则。');
            return;
        }

        const input = prompt(`输入要删除的关键词：\n\n当前关键词：\n${keywordList.join('\n')}`);
        const keyword = String(input || '').trim();
        if (!keyword) return;

        const normalized = normalizeForMatch(keyword);
        const nextList = keywordList.filter(item => normalizeForMatch(item) !== normalized);

        if (nextList.length === keywordList.length) {
            alert('没有找到这个关键词。');
            return;
        }

        keywordList = nextList;
        saveKeywords();
        alert(`已删除关键词：${keyword}`);
    });

    GM_registerMenuCommand('📋 查看拦截关键词', () => {
        alert(keywordList.length
            ? `当前关键词共 ${keywordList.length} 个：\n\n${keywordList.join('\n')}`
            : '当前没有关键词规则。');
    });

    GM_registerMenuCommand('🛡️ 切换当前域名的关键词检测', () => {
        const host = location.hostname;
        const index = keywordAllowList.findIndex(rule => rule.toLowerCase() === host.toLowerCase());

        if (index >= 0) {
            keywordAllowList.splice(index, 1);
            saveKeywordAllowList();
            alert(`已恢复关键词检测：${host}`);
        } else {
            keywordAllowList.push(host);
            saveKeywordAllowList();
            alert(`已停止在此域名检测页面关键词：${host}\n域名黑名单仍然有效。`);
        }

        location.reload();
    });

    GM_registerMenuCommand('🗑️ 重置域名黑名单', () => {
        blackList = [...DEFAULT_BLACKLIST];
        GM_setValue(DOMAIN_STORAGE_KEY, blackList);
        location.reload();
    });

    GM_registerMenuCommand('🧹 清空关键词黑名单', () => {
        if (!confirm('确定清空全部页面关键词吗？')) return;
        keywordList = [...DEFAULT_KEYWORDS];
        GM_setValue(KEYWORD_STORAGE_KEY, keywordList);
        location.reload();
    });

    function init() {
        applyCleanRules();

        // 域名和 URL 关键词可以在页面正文加载前立即判断。
        const earlyReason = detectBlockedReason();
        if (earlyReason) {
            renderBlockPage(earlyReason);
            return;
        }

        startDynamicMonitoring();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => scheduleDetection(0), { once: true });
        } else {
            scheduleDetection(0);
        }
    }

    init();
})();