// ==UserScript==
// @name         全网净化与拦截助手-风险评分版V4.6
// @namespace    http://tampermonkey.net/
// @version      4.6.0
// @description  域名黑名单+三级词库风险评分+主流网站防误伤+拟态拦截卡片
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

(function () {
    'use strict';

    const DOMAIN_KEY = 'block_domain_list_v4_3';
    const ALLOW_KEY = 'keyword_allow_domain_list_v4_6';
    const USER_STRONG_KEY = 'user_strong_terms_v4_6';
    const USER_WEAK_KEY = 'user_weak_terms_v4_6';

    const SCORE_THRESHOLD = 80;
    const BODY_SCAN_LIMIT = 1600000;
    const NODE_SCAN_LIMIT = 260000;

    const DEFAULT_BLACKLIST = [
        'yangdex.com','mrfldh.com','baozougif.com','mmz.moe','tom.ynydsm.com','m.wmtxt.com',
        'm.changdusk.com','sosadfun.net','m.rmxs8.com','wap.bxshuku.com','m.fashuwx.com','xiaomixiaoshuo.com',
        'pornhub','1024z.cc','phncdn.com','p.eikuaitao.com','m2.ddbiquge.cc','m.wrshuw.com','m.xuankuks.com',
        'm.xtxt99.com','wap.baimoge.com','img.ypqrgim.cn','sydswxx.com','dibaqu123.com','wap.ddsge.com',
        'm.ucwxs.com','m.ddshubao.cc','m.heiyan.la','ysiqmzfr.eileader.cn','jj.shzpkc.cn','hongqiao668.com',
        'lingyun-chain.com','m.qududu.cc','m.zaohuatu.com','tesexiaoshuo.com','xwbiquge.cc','minguoqiren.info',
        'xvideos','porn','91short','nineonebuf','2xmzazd.cn','nineone','faloo.com','aabqg520.com',
        'bstatic.pgpfp.com','shushudu.com','182135.com','yandex.com','mohvxrvd.xyz','maihuo.org','utezxmpb.xyz',
        'heiliao','glb112.cc','toutiaocc.com','dqhevnpya9a75','wvwvon.com','lldh5.buzz','lldh.top','88ghl.live',
        'yxz2.huainani.cn','gs5.fun','ilebjy.com','hlcg1.com','obifixjub.tips','jxz4k8.com','hlsxzz.com',
        '911blw.net','zpixtngk.xyz','8ghl.me','abh2g.cc','pic.jfcskx.cn','ibdy33.com','3x5usfan.tips',
        'a1x.net','mshu8.com','biqge6.cc','qishuta.org','wap.bishige.com','bqyd.cc','91-av.com','st10.gs2.fun',
        'yuzhaiw.cc','biquge365.net','m.cuhebook.com','kanunu.info','m.okbiq.com','m.qidian.com','sxxs.cc',
        'm.qidiansk.com','m.dswang.org','babynovel.com','gua04.fun','lyspzc.com.cn','811765.com','biqukan.co',
        'lxjhigzgg.com','cgw10.cc','hllrweg.2024ents.life','tumblr.com','52cg1.fit','mrds1.life','renqixiaoshuo.net',
        'zmhxs.com','qozdwvjr.com','dingdian666.com','aixuwens.com','fxxs2.com','nongcunxsw.cc','diyishu.cc',
        '51baoliao01.com','hlw04.cc','uukojlk.com','cmdseacf.com','nj1ssyiu.net','ggxtnua.org','smzaspg.org',
        'zvecvgl.com','m.hbpas.org','zrhvwdpq.com','bi53.cc','51cg1.com','mshu88.com','aguxs.com','bxrwdyrb.com',
        '199833.xyz','jrgtil.com','m.ltxs520.net','huangsexiaoshuo.net','m.nilxs.com','erifeng.com','gugexs.com',
        'dubmmdpw.com','aaccnn.com','dmdbjywe.com','mrds66.com','doublejoy.cyou','putaoks.com','feifanks.com',
        'n.cn','shenmuxsw.cc','qqdrjkjx.cc','ihlw35.com','tantanread.com','nf8hlbk.com','hlbk11.com','lsxs.org',
        'hl23.co','ranwennovel.com','51bl3.me','cloudfront.net','jpbqg6.com','cgw321.com','w2.sn11a.cc',
        'juemm3.top','mvll8.cc','91blc.com','fshlkq.jpds3.makeup','ifxqgc.flsp2.homes','eld.aavv9.com',
        'nvhai13.top','mmzx12.cc','lds15.cc'
    ];

    const DEFAULT_ALLOWLIST = [
        'google.com','google.com.hk','bing.com','baidu.com','sogou.com','so.com','sm.cn','quark.cn','duckduckgo.com','yahoo.com',
        'zhihu.com','douyin.com','bilibili.com','weibo.com','xiaohongshu.com','toutiao.com','qq.com','weixin.qq.com','douban.com',
        'kuaishou.com','163.com','sina.com.cn','thepaper.cn','ifeng.com','people.com.cn','xinhuanet.com','youtube.com','youku.com',
        'iqiyi.com','mgtv.com','tiktok.com','instagram.com','facebook.com','x.com','twitter.com','reddit.com','quora.com','wikipedia.org',
        'discord.com','telegram.org','chatgpt.com','openai.com','claude.ai','deepseek.com','kimi.com','doubao.com','perplexity.ai',
        'github.com','stackoverflow.com','csdn.net','juejin.cn','jianshu.com','cnblogs.com','v2ex.com','segmentfault.com','notion.so',
        'feishu.cn','docs.qq.com','taobao.com','tmall.com','jd.com','pinduoduo.com','meituan.com','dianping.com','ctrip.com','12306.cn','alipay.com'
    ];

    const STRONG_TERMS = [
        '小穴','肉穴','蜜穴','花穴','淫穴','骚穴','嫩穴','阴穴','穴口','穴壁','蜜壶','淫液','爱液',
        '肉棒','巨根','阳具','肉根','肉柱','肉茎','胯下巨物','抽插','狠狠干','一插到底','撞击花心',
        '口交','深喉','颜射','口射','舔弄阴蒂','吞吐肉棒','舔舐肉棒','舔弄小穴','埋首腿间',
        '肉便器','性奴','高h','高H','肉文','里番','成人动漫','成人漫画','黄色小说','色情小说','成人小说','情色小说',
        '成人视频','色情视频','黄色视频','成人网站','色情网站','成人直播','色情直播','裸体直播','无码av','无码高清',
        '国产自拍','自拍偷拍','成人视频APP','成人直播APP','看片神器','成人视频入口','色情网站导航',
        '同城约炮','附近约炮','招嫖信息','酒店上门服务','按摩特殊服务','洗浴特殊服务'
    ];

    const SPECIAL_TERMS = ['中出'];

    const WEAK_TERMS = [
        ['娇喘', 45], ['娇吟', 38], ['呻吟', 28], ['喘息', 18], ['私处', 28], ['下体', 18], ['乳房', 14], ['乳头', 18],
        ['阴茎', 18], ['阴道', 14], ['射精', 22], ['高潮', 20], ['调教', 22], ['床戏', 22], ['欲望', 12], ['情欲', 20],
        ['淫荡', 35], ['淫乱', 35], ['淫靡', 28], ['发情', 12], ['内射', 45], ['啪啪啪', 10], ['成人内容', 10], ['限制级内容', 10],
        ['强奸', 0], ['强暴', 0], ['轮奸', 0], ['性侵', 0], ['偷拍视频', 0], ['抽搐', 0], ['发情期', 0],
        ['在线赌博', 25], ['网络赌博', 25], ['赌博网站', 35], ['博彩网站', 35], ['真人娱乐城', 35], ['充值送彩金', 35], ['首充送彩金', 35],
        ['刷单返利', 28], ['兼职刷单', 28], ['跑分兼职', 35], ['洗钱跑分', 45], ['银行卡四件套', 45], ['接码平台', 28]
    ];

    const CONTEXT_TERMS = [
        '小穴','肉穴','蜜穴','淫穴','肉棒','巨根','阳具','抽插','肉文','高h','成人视频','色情视频','成人网站',
        '番号','无码','国产自拍','自拍偷拍','颜射','内射','舔弄','调教','性奴','肉便器','口交','深喉'
    ];

    const PROTECT_TERMS = [
        '警方','法院','检察院','记者','通报','案件','新闻','报道','辟谣','反诈','医院','医生','患者','疾病','治疗','检查','手术','科普','研究','论文','法律','判决','未成年人保护','宠物','动物','养殖','兽医','生理期','青春期','教材','课程','心理咨询'
    ];

    const QUOTES = [
        '停。你打开这个页面，不是因为你真的需要它。','先别继续。关掉页面，站起来走十步。','现在退出，还只是一个念头；继续下去，就会变成一段浪费。',
        '别跟冲动讲道理，直接关掉。','这一页没有你真正想要的东西。','你已经识别到诱惑了，现在只差执行关闭。','此刻最正确的动作只有一个：关闭页面。',
        '这只是冲动，不是命令。','欲望会升起，也会自然退下，你不需要服从它。','你现在缺的可能是休息，不是刺激。','别把无聊误认成需求，别把冲动误认成选择。',
        '几分钟的刺激，可能换来几个小时的涣散。','不要让一次点击，带走整个晚上的节奏。','继续浏览不会结束欲望，只会喂大欲望。','每一次及时停止，都是在削弱坏习惯。',
        '关掉它，喝口水，洗把脸，重新开始。','把手机放远两分钟，让冲动自己下降。','先离开这个房间，换一个环境。','先做五分钟正事，五分钟后再重新判断。',
        '已经看了不代表必须继续，止损永远来得及。','一次滑坡不等于整晚失败。','最好的停止时间是打开之前，其次就是现在。','现在收手，就是在保护接下来的自己。',
        '你想成为的人，不会把时间交给这种页面。','真正的自由，是能对即时刺激说不。','你的时间很贵，不该被廉价刺激收割。','不要背叛那个正在努力改变生活的自己。',
        '关掉。别再给自己找借口。','不要拿“最后一次”欺骗自己。','这不是奖励，这是陷阱。','别把失控包装成放松。','关闭页面，别让垃圾内容赢。',
        '不用责怪自己，轻轻关掉页面就好。','冲动出现很正常，选择不跟随它就够了。','现在退出，不是剥夺快乐，而是在保护自己。','你可以重新开始，而且不需要等到明天。',
        '十分钟后，你会感谢自己继续看，还是感谢自己及时退出？','你是在主动选择，还是在被冲动操控？','这个页面能解决你现在真正的问题吗？','你想要的是几秒快感，还是一整晚的掌控感？',
        '冲动会过去，选择会留下。','关掉刺激，拿回注意力。','不点开，是自由；能退出，是力量。','退出不是损失，是止损。','清醒比快感更值钱。','关掉页面，回到人生。'
    ];

    const CLEAN_RULES = {
        'yinxiang.com': '.sc-jWBwVP,.eBgsec,.sc-cMljjf,.sc-hSdWYo,img[src*="yx-icon@300.png"]',
        'flomoapp.com': '.LaunchAppTop,.LaunchAppBottom',
        'weread.qq.com': '.wr_tabBar_item_App,.wr_tabBar',
        'jianshu.com': '.jianshu-header,img[src*="assets.xiaozuowen.net"],#jianshu-header',
        'zsxq.com': 'app-header>.header-container,footer,.qrcode-container,.enter-group,#header,.user-info',
        'dedao.cn': '.iget-invoke-app-bar,.logo,.update-reminder'
    };

    const IGNORED_SELECTOR = 'script,style,noscript,template,svg,canvas,code,pre,textarea,input,select,option,[contenteditable="true"],#focus-block-root';

    let blocked = false;
    let observer = null;
    let observedRoot = null;
    let scanTimer = null;
    let urlTimer = null;
    let safetyTimer = null;
    let guardTimer = null;
    let quoteTimer = null;
    let lastUrl = location.href;
    let lastScan = 0;

    const blackList = loadList(DOMAIN_KEY, ['block_domain_list_v4'], DEFAULT_BLACKLIST);
    let allowList = loadList(ALLOW_KEY, ['keyword_allow_domain_list_v4_5','keyword_allow_domain_list_v4_3','keyword_allow_domain_list_v4_2','keyword_allow_domain_list_v4_1'], DEFAULT_ALLOWLIST);
    let userStrongTerms = unique(GM_getValue(USER_STRONG_KEY, []));
    let userWeakTerms = unique(GM_getValue(USER_WEAK_KEY, []));

    function unique(list) {
        return [...new Set((Array.isArray(list) ? list : []).map(v => String(v).trim()).filter(Boolean))];
    }

    function storedArray(key) {
        const value = GM_getValue(key, null);
        return Array.isArray(value) ? value : null;
    }

    function loadList(key, oldKeys, defaults) {
        const current = storedArray(key);
        if (current) return unique(current);
        const migrated = [];
        for (const oldKey of oldKeys) {
            const oldValue = storedArray(oldKey);
            if (oldValue) migrated.push(...oldValue);
        }
        const result = unique([...defaults, ...migrated]);
        GM_setValue(key, result);
        return result;
    }

    function saveAllowList() {
        allowList = unique(allowList);
        GM_setValue(ALLOW_KEY, allowList);
    }

    function saveUserStrong() {
        userStrongTerms = unique(userStrongTerms);
        GM_setValue(USER_STRONG_KEY, userStrongTerms);
    }

    function saveUserWeak() {
        userWeakTerms = unique(userWeakTerms);
        GM_setValue(USER_WEAK_KEY, userWeakTerms);
    }

    function normalize(value) {
        let text = String(value || '');
        try { text = text.normalize('NFKC'); } catch (error) {}
        text = text.toLowerCase();
        try { return text.replace(/[\s\u200B-\u200D\uFEFF\p{P}\p{S}]+/gu, ''); }
        catch (error) { return text.replace(/[\s\u200B-\u200D\uFEFF\-_.·•,，。！？!?:：;；'"“”‘’()（）[\]【】{}<>《》/\\|@#$%^&*+=~`]+/g, ''); }
    }

    function domainMatches(host, rule) {
        const h = String(host || '').toLowerCase().replace(/^www\./, '');
        const r = String(rule || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
        if (!r) return false;
        return r.includes('.') ? (h === r || h.endsWith('.' + r)) : h.includes(r);
    }

    function domainBlocked() { return blackList.some(rule => domainMatches(location.hostname, rule)); }
    function keywordAllowed() { return !allowList.some(rule => domainMatches(location.hostname, rule)); }

    function countOccurrences(haystack, needle) {
        if (!haystack || !needle) return 0;
        let count = 0;
        let idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) !== -1) {
            count += 1;
            idx += Math.max(needle.length, 1);
            if (count >= 20) break;
        }
        return count;
    }

    function hasAny(normalizedText, terms) {
        return terms.some(term => normalizedText.includes(normalize(term)));
    }

    function analyzeText(text, source) {
        if (!text || !keywordAllowed()) return null;
        const rawText = String(text || '');
        const normalizedText = normalize(rawText);
        if (!normalizedText) return null;

        const allStrong = unique([...STRONG_TERMS, ...userStrongTerms]);
        for (const term of allStrong) {
            const n = normalize(term);
            if (n && normalizedText.includes(n)) {
                return { type: 'risk', method: '高度明确词', keyword: term, source, score: 100 };
            }
        }

        const contextHit = hasAny(normalizedText, CONTEXT_TERMS);
        const specialHits = [];
        for (const term of SPECIAL_TERMS) {
            const n = normalize(term);
            const rawCount = countOccurrences(rawText, term);
            const looseCount = countOccurrences(normalizedText, n);
            if (rawCount >= 2 || (rawCount >= 1 && contextHit) || (looseCount >= 2 && contextHit)) {
                return { type: 'risk', method: '特殊词+语境', keyword: term, source, score: 95 };
            }
            if (rawCount || looseCount) specialHits.push(term);
        }

        let score = 0;
        const hits = [];
        const weakMap = new Map(WEAK_TERMS.map(([term, points]) => [term, points]));
        for (const term of userWeakTerms) weakMap.set(term, 25);

        for (const [term, points] of weakMap.entries()) {
            const n = normalize(term);
            if (!n) continue;
            const count = countOccurrences(normalizedText, n);
            if (count > 0) {
                const capped = Math.min(count, 5);
                score += Math.max(points, 0) * capped;
                if (count >= 2 && points > 0) score += 10;
                hits.push({ term, count, points });
            }
        }

        const positiveHits = hits.filter(h => h.points > 0);
        if (positiveHits.length >= 2) score += 30;
        if (positiveHits.length >= 3) score += 20;
        if (contextHit && positiveHits.length >= 1) score += 25;
        if (specialHits.length && positiveHits.length >= 1) score += 35;

        const protectCount = PROTECT_TERMS.reduce((sum, term) => sum + (normalizedText.includes(normalize(term)) ? 1 : 0), 0);
        if (protectCount > 0 && !contextHit) score -= Math.min(50, protectCount * 18);

        if (score >= SCORE_THRESHOLD) {
            const summary = hits
                .filter(h => h.count > 0)
                .slice(0, 8)
                .map(h => `${h.term}×${h.count}`)
                .join('、');
            return { type: 'risk', method: '累计风险评分', keyword: summary || '弱词组合', source, score };
        }

        return null;
    }

    function decodedUrl() {
        try { return decodeURIComponent(location.href); } catch (error) { return location.href; }
    }

    function detectStatic() {
        if (!keywordAllowed()) return null;
        return analyzeText(decodedUrl(), '网页地址') || analyzeText(document.title || '', '网页标题') || analyzeMeta();
    }

    function analyzeMeta() {
        if (!document.documentElement) return null;
        const metaText = Array.from(document.querySelectorAll([
            'meta[name="description"]','meta[name="keywords"]','meta[property="og:title"]','meta[property="og:description"]','meta[name="twitter:title"]','meta[name="twitter:description"]'
        ].join(','))).map(el => el.getAttribute('content') || '').join(' ');
        return analyzeText(metaText, '网页描述');
    }

    function ignoredElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        try { return Boolean(element.matches(IGNORED_SELECTOR) || element.closest(IGNORED_SELECTOR)); }
        catch (error) { return false; }
    }

    function ignoredTextNode(node) { return !node || !node.parentElement || ignoredElement(node.parentElement); }

    function detectNode(node) {
        if (!node || blocked || !keywordAllowed()) return null;
        if (node.nodeType === Node.TEXT_NODE) {
            if (ignoredTextNode(node)) return null;
            return analyzeText(node.nodeValue || '', '动态加载正文');
        }
        if (node.nodeType !== Node.ELEMENT_NODE || ignoredElement(node)) return null;
        let text = '';
        try { text = node.innerText || node.textContent || ''; }
        catch (error) { text = node.textContent || ''; }
        return analyzeText(text.slice(0, NODE_SCAN_LIMIT), '动态加载正文');
    }

    function detectBody() {
        if (!keywordAllowed() || !document.body) return null;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (ignoredTextNode(node)) return NodeFilter.FILTER_REJECT;
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let text = '';
        let node;
        while ((node = walker.nextNode())) {
            text += ' ' + (node.nodeValue || '');
            if (text.length >= BODY_SCAN_LIMIT) break;
        }
        return analyzeText(text, '页面正文');
    }

    function detectReason() {
        if (domainBlocked()) return { type: 'domain', domain: location.hostname, source: '域名黑名单' };
        if (!keywordAllowed()) return null;
        return detectStatic() || detectBody();
    }

    function escapeHtml(value) {
        return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function randomQuote() { return QUOTES[Math.floor(Math.random() * QUOTES.length)]; }

    function stopMonitoring() {
        if (observer) { observer.disconnect(); observer = null; }
        if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
        if (urlTimer) { clearInterval(urlTimer); urlTimer = null; }
        if (safetyTimer) { clearInterval(safetyTimer); safetyTimer = null; }
    }

    function renderBlock(reason) {
        if (blocked) return;
        blocked = true;
        stopMonitoring();
        try { window.stop(); } catch (error) {}

        const reasonText = reason.type === 'domain'
            ? `已拦截域名：${escapeHtml(reason.domain)}`
            : `触发方式：${escapeHtml(reason.method)}｜命中：${escapeHtml(reason.keyword)}｜位置：${escapeHtml(reason.source)}｜评分：${escapeHtml(reason.score)}`;

        function enforce() {
            if (!document.documentElement) return;
            document.documentElement.style.setProperty('overflow', 'hidden', 'important');
            document.documentElement.style.setProperty('background', '#e0e5ec', 'important');
            if (document.body) {
                document.body.style.setProperty('overflow', 'hidden', 'important');
                document.body.style.setProperty('background', '#e0e5ec', 'important');
            }
            let style = document.getElementById('focus-block-style');
            if (!style) {
                style = document.createElement('style');
                style.id = 'focus-block-style';
                style.textContent = `
                    #focus-block-root{all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100vw!important;height:100vh!important;padding:18px!important;box-sizing:border-box!important;overflow:hidden!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;background:#e0e5ec!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif!important;}
                    #focus-block-root,#focus-block-root *{box-sizing:border-box!important;}
                    #focus-block-card{width:min(760px,92vw)!important;padding:42px 36px!important;border-radius:30px!important;background:#e0e5ec!important;text-align:center!important;box-shadow:20px 20px 60px #bec3c9,-20px -20px 60px #ffffff!important;}
                    #focus-block-quote{margin:0 0 20px 0!important;color:#313b48!important;font-size:clamp(22px,4vw,34px)!important;font-weight:400!important;line-height:1.65!important;}
                    #focus-block-quote strong{color:#e53e3e!important;}
                    #focus-block-timer{color:#e53e3e!important;font-size:20px!important;font-weight:700!important;}
                    #focus-block-reason{margin-top:20px!important;color:#7b8794!important;font-size:13px!important;line-height:1.6!important;word-break:break-all!important;}
                    @media screen and (max-width:600px){#focus-block-card{width:100%!important;padding:34px 23px!important;border-radius:24px!important;}#focus-block-quote{font-size:23px!important;}}
                `;
                (document.head || document.documentElement).appendChild(style);
            }
            let root = document.getElementById('focus-block-root');
            if (!root) {
                root = document.createElement('div');
                root.id = 'focus-block-root';
                root.innerHTML = `<div id="focus-block-card"><div id="focus-block-quote">${randomQuote()}</div><div id="focus-block-timer"><span id="focus-block-countdown">10</span>s</div><div id="focus-block-reason">${reasonText}</div></div>`;
                document.documentElement.appendChild(root);
            }
        }

        enforce();
        guardTimer = setInterval(() => {
            if (!blocked) { clearInterval(guardTimer); guardTimer = null; return; }
            enforce();
            try { window.stop(); } catch (error) {}
        }, 100);

        let count = 10;
        quoteTimer = setInterval(() => {
            count -= 1;
            const countdown = document.getElementById('focus-block-countdown');
            const quote = document.getElementById('focus-block-quote');
            if (countdown) countdown.textContent = String(Math.max(count, 0));
            if (count <= 0) { count = 10; if (quote) quote.innerHTML = randomQuote(); }
        }, 1000);
    }

    function applyCleanRules() {
        const host = location.hostname;
        for (const [domain, selector] of Object.entries(CLEAN_RULES)) {
            if (host === domain || host.endsWith('.' + domain)) GM_addStyle(`${selector}{display:none!important;}`);
        }
    }

    function runScan() {
        if (blocked) return;
        lastScan = Date.now();
        const reason = detectReason();
        if (reason) renderBlock(reason);
    }

    function scheduleScan(delay = 80, force = false) {
        if (blocked) return;
        if (scanTimer) clearTimeout(scanTimer);
        let wait = Math.max(0, delay);
        if (!force) wait = Math.max(wait, 180 - (Date.now() - lastScan), 0);
        scanTimer = setTimeout(runScan, wait);
    }

    function attachObserver() {
        if (blocked || !document.documentElement) return;
        if (observer && observedRoot === document.documentElement) return;
        if (observer) observer.disconnect();
        observedRoot = document.documentElement;
        observer = new MutationObserver(mutations => {
            if (blocked || !keywordAllowed()) return;
            for (const mutation of mutations) {
                if (mutation.type === 'characterData') {
                    const hit = detectNode(mutation.target);
                    if (hit) { renderBlock(hit); return; }
                }
                if (mutation.type === 'childList') {
                    for (const addedNode of mutation.addedNodes) {
                        const hit = detectNode(addedNode);
                        if (hit) { renderBlock(hit); return; }
                    }
                }
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target && target.nodeType === Node.ELEMENT_NODE) {
                        const attributeText = ['content','title','href'].map(name => target.getAttribute(name)).filter(Boolean).join(' ');
                        const hit = analyzeText(attributeText, '动态页面属性');
                        if (hit) { renderBlock(hit); return; }
                    }
                }
            }
            scheduleScan(60, true);
        });
        observer.observe(observedRoot, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['content','title','href'] });
    }

    function patchHistory() {
        if (window.__focusBlockHistoryPatched) return;
        window.__focusBlockHistoryPatched = true;
        for (const method of ['pushState','replaceState']) {
            const original = history[method];
            history[method] = function (...args) {
                const result = original.apply(this, args);
                setTimeout(() => { lastUrl = location.href; attachObserver(); scheduleScan(0, true); }, 0);
                return result;
            };
        }
    }

    function startMonitoring() {
        attachObserver();
        patchHistory();
        const rescan = () => { attachObserver(); scheduleScan(0, true); };
        window.addEventListener('popstate', rescan, true);
        window.addEventListener('hashchange', rescan, true);
        window.addEventListener('pageshow', rescan, true);
        window.addEventListener('focus', rescan, true);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) rescan(); }, true);
        urlTimer = setInterval(() => {
            if (blocked) return;
            attachObserver();
            if (location.href !== lastUrl) { lastUrl = location.href; scheduleScan(0, true); }
        }, 250);
        let checks = 0;
        safetyTimer = setInterval(() => {
            if (blocked) return;
            checks += 1;
            attachObserver();
            scheduleScan(0, true);
            if (checks >= 24) {
                clearInterval(safetyTimer);
                safetyTimer = setInterval(() => { if (!blocked) { attachObserver(); scheduleScan(0, true); } }, 5000);
            }
        }, 250);
    }

    GM_registerMenuCommand('📌 拦截当前域名', () => {
        const host = location.hostname;
        if (!blackList.some(rule => rule.toLowerCase() === host.toLowerCase())) blackList.push(host);
        GM_setValue(DOMAIN_KEY, unique(blackList));
        location.reload();
    });

    GM_registerMenuCommand('🔤 添加强拦截词', () => {
        const term = String(prompt('输入强拦截词：命中一次直接拦截。') || '').trim();
        if (!term) return;
        userStrongTerms.push(term);
        saveUserStrong();
        alert(`已添加强拦截词：${term}`);
        scheduleScan(0, true);
    });

    GM_registerMenuCommand('🟡 添加弱评分词', () => {
        const term = String(prompt('输入弱评分词：不会单独拦截，会参与累计评分。') || '').trim();
        if (!term) return;
        userWeakTerms.push(term);
        saveUserWeak();
        alert(`已添加弱评分词：${term}`);
        scheduleScan(0, true);
    });

    GM_registerMenuCommand('🛡️ 当前网站关闭/恢复关键词检测', () => {
        const host = location.hostname;
        const idx = allowList.findIndex(rule => rule.toLowerCase() === host.toLowerCase());
        if (idx >= 0) { allowList.splice(idx, 1); alert(`已恢复关键词检测：${host}`); }
        else { allowList.push(host); alert(`已关闭该网站的关键词检测：${host}`); }
        saveAllowList();
        location.reload();
    });

    GM_registerMenuCommand('📋 查看主流白名单', () => { alert(`以下网站不扫描页面关键词，共 ${allowList.length} 个：\n\n${allowList.join('\n')}`); });
    GM_registerMenuCommand('📋 查看自定义词', () => { alert(`强拦截词：\n${userStrongTerms.join('\n') || '无'}\n\n弱评分词：\n${userWeakTerms.join('\n') || '无'}`); });
    GM_registerMenuCommand('♻️ 恢复默认主流白名单', () => { allowList = [...DEFAULT_ALLOWLIST]; saveAllowList(); location.reload(); });

    function init() {
        applyCleanRules();
        const earlyReason = detectReason();
        if (earlyReason) { renderBlock(earlyReason); return; }
        startMonitoring();
        scheduleScan(0, true);
        document.addEventListener('readystatechange', () => scheduleScan(0, true), true);
        document.addEventListener('DOMContentLoaded', () => scheduleScan(0, true), { once:true, capture:true });
        window.addEventListener('load', () => scheduleScan(0, true), { once:true, capture:true });
        [0,30,60,100,160,250,400,650,900,1300,1800,2500,3500,5000,7000].forEach(delay => {
            setTimeout(() => { if (!blocked) { attachObserver(); scheduleScan(0, true); } }, delay);
        });
    }

    init();
})();
