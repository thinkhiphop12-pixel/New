/**
 * Translations for the localised landing pages.
 *
 * Each locale maps an exact snippet of `index.html` to its replacement. Keys are
 * matched literally (longest first), so they carry enough surrounding markup to
 * be unambiguous — `<div class="lbl">Leagues</div>` rather than bare `Leagues`.
 *
 * Brand names (BALLKNW, Gaffa, Draft XI, Scout) stay untranslated everywhere.
 *
 * The five locales are the world's most spoken languages after English:
 * Mandarin, Hindi, Spanish, French and Arabic.
 */

export const LOCALES = [
  {
    code: 'zh',
    htmlLang: 'zh-Hans',
    hreflang: 'zh-Hans',
    dir: 'ltr',
    path: '/zh/',
    ogLocale: 'zh_CN',
    short: '中文',
    changeLanguage: '切换语言',
    gameNote: '游戏界面为英文。',
    strings: {
      '<title>Free Football Manager Game Online | Play Gaffa - No Download</title>':
        '<title>免费足球经理游戏在线玩 | 畅玩 Gaffa - 无需下载</title>',
      'Free football manager game online — manage a real club in your browser with no download or account. Plus draft XI and daily puzzles. Play Gaffa now, completely free.':
        '免费在线足球经理游戏——在浏览器里执教真实球队，无需下载、无需注册。还有选秀阵容和每日谜题。立即免费畅玩 Gaffa。',
      'free football manager, football manager game, free football manager online, play football manager free, football management game, browser football game, free football games':
        '免费足球经理, 足球经理游戏, 在线足球经理, 足球经营游戏, 浏览器足球游戏, 免费足球游戏',
      'Free Football Manager Game Online | Play Now in Your Browser':
        '免费足球经理游戏 | 打开浏览器即可畅玩',
      'Play a free football manager game online. Manage a real English league club, run tactics and transfers — no download, no account needed.':
        '免费在线畅玩足球经理游戏。执教真实的英格兰联赛球队，制定战术、运作转会——无需下载，无需注册。',
      'Free Football Manager Game Online - Play Gaffa': '免费足球经理游戏 - 畅玩 Gaffa',
      'Free football manager game online. Manage a real English league club in your browser — no download, no account, completely free.':
        '免费在线足球经理游戏。在浏览器里执教真实的英格兰联赛球队——无需下载，无需注册，完全免费。',

      '&nbsp;playing now': '&nbsp;人正在游戏',
      '<h1>Free Football Manager<br><span class="grad">Play Online, No Download</span></h1>':
        '<h1>免费足球经理<br><span class="grad">在线畅玩，无需下载</span></h1>',
      'A football management simulation, free and playable online. Take charge of a real English league club — set your tactics, sign players in the transfer market, and simulate a full season — all in your browser.':
        '一款免费的在线足球经营模拟游戏。执掌一支真实的英格兰联赛球队——制定战术、在转会市场上引援、模拟完整赛季——全部在浏览器中完成。',
      '>Play Gaffa ↓</a>': '>畅玩 Gaffa ↓</a>',
      '<p class="subline">Free &middot; no account &middot; saves automatically</p>':
        '<p class="subline">免费 &middot; 无需注册 &middot; 自动存档</p>',

      '<div class="lbl">Players rated</div>': '<div class="lbl">已评级球员</div>',
      '<div class="lbl">Leagues</div>': '<div class="lbl">联赛</div>',
      '<div class="lbl">Real clubs</div>': '<div class="lbl">真实球队</div>',
      '<div class="num">Free</div>': '<div class="num">免费</div>',
      '<div class="lbl">No login</div>': '<div class="lbl">无需登录</div>',

      '>Open full screen ↗</a>': '>全屏打开 ↗</a>',
      '>Strategy guide</a>': '>策略指南</a>',

      '<div class="eyebrow">How it works</div>': '<div class="eyebrow">玩法说明</div>',
      '<h2>Four steps to kickoff</h2>': '<h2>四步开球</h2>',
      '<h3>Pick your club</h3>': '<h3>选择球队</h3>',
      'Choose from every club across three divisions, or let the game assign one.':
        '从三级联赛的所有球队中挑选，或让游戏为你分配一支。',
      '<h3>Set your tactics</h3>': '<h3>制定战术</h3>',
      'Formation, instructions, set pieces — build the way your team plays.':
        '阵型、指令、定位球——打造属于你的球队踢法。',
      '<h3>Work the market</h3>': '<h3>运作转会</h3>',
      'Scout, negotiate and sign — all within a real wage and transfer budget.':
        '球探、谈判、签约——都在真实的薪资与转会预算之内。',
      '<h3>Survive the board</h3>': '<h3>顶住董事会</h3>',
      'Hit your season objectives or face the sack. Your save persists automatically.':
        '完成赛季目标，否则就得下课。存档会自动保留。',

      '<div class="eyebrow">FAQ</div>': '<div class="eyebrow">常见问题</div>',
      '<h2>Quick answers</h2>': '<h2>快速解答</h2>',
      'Are the BALLKNW football games really free?': 'BALLKNW 的足球游戏真的免费吗？',
      'Yes — every game on ballknw.com is 100% free to play in your browser. No account, no download, no paywall. The site is supported by light, consent-based advertising.':
        '是的——ballknw.com 上的每款游戏都可以在浏览器中 100% 免费畅玩。无需注册、无需下载、没有付费墙。本站依靠轻量且征得同意的广告维持运营。',
      'Do I need an account to play or save my progress?': '玩游戏或保存进度需要注册账号吗？',
      'No. Your Gaffa save, streaks and progress are stored in your browser automatically. Come back on the same device and browser and your game continues.':
        '不需要。你的 Gaffa 存档、连胜纪录和进度都会自动保存在浏览器里。用同一台设备、同一个浏览器回来，游戏就会继续。',
      'What can I do in Gaffa?': '在 Gaffa 里可以做什么？',
      'Pick a real English league club and manage it for a full season — tactics, transfers, contracts, cups and a youth academy. Your save lives in your browser.':
        '挑选一支真实的英格兰联赛球队，执教完整一个赛季——战术、转会、合同、杯赛和青训营。存档就保存在你的浏览器中。',
      'Where does the player and squad data come from?': '球员和阵容数据来自哪里？',
      'BALLKNW builds its squads from public football datasets — current-season club squads and every World Cup squad from 1930 through 2026. In-game ratings are our own stylized approximations for gameplay, not official figures from any ratings provider.':
        'BALLKNW 的阵容数据来自公开的足球数据集——本赛季各俱乐部阵容，以及 1930 年至 2026 年历届世界杯阵容。游戏内评分是我们为玩法所做的风格化估算，并非任何官方评分机构的数据。',
      'Is BALLKNW affiliated with FIFA, the Premier League or any official sports body?':
        'BALLKNW 与国际足联、英超或任何官方体育机构有关联吗？',
      'No. BALLKNW is an independent, unofficial, fan-made project. It is not affiliated with, endorsed by, or connected to Sports Interactive, SEGA, EA Sports, FIFA, the Premier League, the English Football League, or any club or competition. All product names and trademarks belong to their respective owners. We use official data and names descriptively for gameplay, with proper attribution.':
        '没有。BALLKNW 是一个独立的、非官方的球迷项目，与 Sports Interactive、SEGA、EA Sports、国际足联、英超联赛、英格兰足球联赛以及任何俱乐部或赛事均无关联、未获其认可、也无任何联系。所有产品名称和商标均归各自所有者所有。我们仅出于玩法需要，以描述性方式使用官方数据和名称，并注明出处。',

      '<div class="eyebrow">Before you go</div>': '<div class="eyebrow">离开之前</div>',
      '<h2>Three games.<br>One tab. Still free.</h2>': '<h2>三款游戏。<br>一个标签页。依然免费。</h2>',
      'Your save, streak and squad live in this browser — close the tab, come back, pick the season up where you left it.':
        '你的存档、连胜和阵容都保存在这个浏览器里——关掉标签页，回来后从上次的地方继续赛季。',
      '>Play Gaffa</a>': '>畅玩 Gaffa</a>',
      '<span class="k">Career</span><span class="fx-name">Gaffa · full season</span>':
        '<span class="k">生涯</span><span class="fx-name">Gaffa · 完整赛季</span>',
      '<span class="k">Draft</span><span class="fx-name">Draft XI · build a squad</span>':
        '<span class="k">选秀</span><span class="fx-name">Draft XI · 组建阵容</span>',
      '<span class="k">Daily</span><span class="fx-name">Scout · today\'s puzzle</span>':
        '<span class="k">每日</span><span class="fx-name">Scout · 今日谜题</span>',
      '<span class="k">Guide</span><span class="fx-name">Tactics &amp; transfers</span>':
        '<span class="k">指南</span><span class="fx-name">战术与转会</span>',
      '<span class="board-top-meta">Matchday hub</span>': '<span class="board-top-meta">比赛日中心</span>',
      Advertisement: '广告',

      '<a href="/privacy.html">Privacy</a>': '<a href="/privacy.html">隐私</a>',
      '<a href="/terms.html">Terms</a>': '<a href="/terms.html">条款</a>',
      '>Cookie settings</a>': '>Cookie 设置</a>',
      '>Contact</a>': '>联系我们</a>',
      'Made for football heads. Data from public sources. © BALLKNW · ballknw.com · Updated July 8, 2026':
        '为热爱足球的人打造。数据来自公开来源。© BALLKNW · ballknw.com · 更新于 2026 年 7 月 8 日',
      '>Explainers: <a': '>术语解析（英文）：<a',
      '>Guides: <a': '>指南（英文）：<a',
    },
  },

  {
    code: 'hi',
    htmlLang: 'hi',
    hreflang: 'hi',
    dir: 'ltr',
    path: '/hi/',
    ogLocale: 'hi_IN',
    short: 'हिन्दी',
    changeLanguage: 'भाषा बदलें',
    gameNote: 'गेम अंग्रेज़ी में है।',
    strings: {
      '<title>Free Football Manager Game Online | Play Gaffa - No Download</title>':
        '<title>मुफ़्त फुटबॉल मैनेजर गेम ऑनलाइन | Gaffa खेलें - कोई डाउनलोड नहीं</title>',
      'Free football manager game online — manage a real club in your browser with no download or account. Plus draft XI and daily puzzles. Play Gaffa now, completely free.':
        'मुफ़्त फुटबॉल मैनेजर गेम ऑनलाइन — अपने ब्राउज़र में असली क्लब चलाएँ, न डाउनलोड न अकाउंट। साथ में ड्राफ्ट XI और रोज़ की पहेली। Gaffa अभी खेलें, पूरी तरह मुफ़्त।',
      'free football manager, football manager game, free football manager online, play football manager free, football management game, browser football game, free football games':
        'मुफ़्त फुटबॉल मैनेजर, फुटबॉल मैनेजर गेम, ऑनलाइन फुटबॉल मैनेजर, फुटबॉल मैनेजमेंट गेम, ब्राउज़र फुटबॉल गेम, मुफ़्त फुटबॉल गेम्स',
      'Free Football Manager Game Online | Play Now in Your Browser':
        'मुफ़्त फुटबॉल मैनेजर गेम ऑनलाइन | ब्राउज़र में अभी खेलें',
      'Play a free football manager game online. Manage a real English league club, run tactics and transfers — no download, no account needed.':
        'ऑनलाइन मुफ़्त फुटबॉल मैनेजर गेम खेलें। असली इंग्लिश लीग क्लब चलाएँ, रणनीति और ट्रांसफ़र सँभालें — न डाउनलोड, न अकाउंट।',
      'Free Football Manager Game Online - Play Gaffa': 'मुफ़्त फुटबॉल मैनेजर गेम - Gaffa खेलें',
      'Free football manager game online. Manage a real English league club in your browser — no download, no account, completely free.':
        'मुफ़्त फुटबॉल मैनेजर गेम ऑनलाइन। अपने ब्राउज़र में असली इंग्लिश लीग क्लब चलाएँ — न डाउनलोड, न अकाउंट, पूरी तरह मुफ़्त।',

      '&nbsp;playing now': '&nbsp;अभी खेल रहे हैं',
      '<h1>Free Football Manager<br><span class="grad">Play Online, No Download</span></h1>':
        '<h1>मुफ़्त फुटबॉल मैनेजर<br><span class="grad">ऑनलाइन खेलें, डाउनलोड नहीं</span></h1>',
      'A football management simulation, free and playable online. Take charge of a real English league club — set your tactics, sign players in the transfer market, and simulate a full season — all in your browser.':
        'एक फुटबॉल प्रबंधन सिमुलेशन, मुफ़्त और ऑनलाइन खेलने योग्य। असली इंग्लिश लीग क्लब की कमान सँभालें — अपनी रणनीति तय करें, ट्रांसफ़र बाज़ार में खिलाड़ी खरीदें और पूरा सीज़न सिम्युलेट करें — सब कुछ आपके ब्राउज़र में।',
      '>Play Gaffa ↓</a>': '>Gaffa खेलें ↓</a>',
      '<p class="subline">Free &middot; no account &middot; saves automatically</p>':
        '<p class="subline">मुफ़्त &middot; अकाउंट नहीं &middot; अपने आप सेव</p>',

      '<div class="lbl">Players rated</div>': '<div class="lbl">रेटेड खिलाड़ी</div>',
      '<div class="lbl">Leagues</div>': '<div class="lbl">लीग</div>',
      '<div class="lbl">Real clubs</div>': '<div class="lbl">असली क्लब</div>',
      '<div class="num">Free</div>': '<div class="num">मुफ़्त</div>',
      '<div class="lbl">No login</div>': '<div class="lbl">लॉगिन नहीं</div>',

      '>Open full screen ↗</a>': '>पूरी स्क्रीन पर खोलें ↗</a>',
      '>Strategy guide</a>': '>रणनीति गाइड</a>',

      '<div class="eyebrow">How it works</div>': '<div class="eyebrow">यह कैसे काम करता है</div>',
      '<h2>Four steps to kickoff</h2>': '<h2>किक-ऑफ़ तक चार कदम</h2>',
      '<h3>Pick your club</h3>': '<h3>अपना क्लब चुनें</h3>',
      'Choose from every club across three divisions, or let the game assign one.':
        'तीन डिवीज़न के सभी क्लबों में से चुनें, या गेम को आपके लिए क्लब चुनने दें।',
      '<h3>Set your tactics</h3>': '<h3>अपनी रणनीति तय करें</h3>',
      'Formation, instructions, set pieces — build the way your team plays.':
        'फ़ॉर्मेशन, निर्देश, सेट पीस — अपनी टीम का खेल खुद गढ़ें।',
      '<h3>Work the market</h3>': '<h3>ट्रांसफ़र बाज़ार सँभालें</h3>',
      'Scout, negotiate and sign — all within a real wage and transfer budget.':
        'स्काउट करें, मोल-भाव करें और साइन करें — असली वेतन और ट्रांसफ़र बजट के भीतर।',
      '<h3>Survive the board</h3>': '<h3>बोर्ड का सामना करें</h3>',
      'Hit your season objectives or face the sack. Your save persists automatically.':
        'सीज़न के लक्ष्य पूरे करें वरना नौकरी जाएगी। आपका सेव अपने आप सुरक्षित रहता है।',

      '<div class="eyebrow">FAQ</div>': '<div class="eyebrow">सामान्य सवाल</div>',
      '<h2>Quick answers</h2>': '<h2>त्वरित जवाब</h2>',
      'Are the BALLKNW football games really free?': 'क्या BALLKNW के फुटबॉल गेम सच में मुफ़्त हैं?',
      'Yes — every game on ballknw.com is 100% free to play in your browser. No account, no download, no paywall. The site is supported by light, consent-based advertising.':
        'हाँ — ballknw.com का हर गेम आपके ब्राउज़र में 100% मुफ़्त है। न अकाउंट, न डाउनलोड, न पेवॉल। साइट हल्के, सहमति-आधारित विज्ञापनों से चलती है।',
      'Do I need an account to play or save my progress?':
        'खेलने या प्रगति सेव करने के लिए क्या अकाउंट चाहिए?',
      'No. Your Gaffa save, streaks and progress are stored in your browser automatically. Come back on the same device and browser and your game continues.':
        'नहीं। आपका Gaffa सेव, स्ट्रीक और प्रगति अपने आप आपके ब्राउज़र में सुरक्षित रहती है। उसी डिवाइस और ब्राउज़र पर लौटें और खेल वहीं से जारी रहेगा।',
      'What can I do in Gaffa?': 'Gaffa में क्या-क्या कर सकते हैं?',
      'Pick a real English league club and manage it for a full season — tactics, transfers, contracts, cups and a youth academy. Your save lives in your browser.':
        'असली इंग्लिश लीग क्लब चुनें और उसे पूरे सीज़न चलाएँ — रणनीति, ट्रांसफ़र, कॉन्ट्रैक्ट, कप और यूथ अकादमी। आपका सेव आपके ब्राउज़र में ही रहता है।',
      'Where does the player and squad data come from?': 'खिलाड़ी और स्क्वाड का डेटा कहाँ से आता है?',
      'BALLKNW builds its squads from public football datasets — current-season club squads and every World Cup squad from 1930 through 2026. In-game ratings are our own stylized approximations for gameplay, not official figures from any ratings provider.':
        'BALLKNW अपने स्क्वाड सार्वजनिक फुटबॉल डेटासेट से बनाता है — मौजूदा सीज़न के क्लब स्क्वाड और 1930 से 2026 तक के हर विश्व कप स्क्वाड। गेम की रेटिंग हमारी अपनी शैलीबद्ध अनुमानित रेटिंग हैं, किसी आधिकारिक रेटिंग प्रदाता के आँकड़े नहीं।',
      'Is BALLKNW affiliated with FIFA, the Premier League or any official sports body?':
        'क्या BALLKNW फ़ीफ़ा, प्रीमियर लीग या किसी आधिकारिक खेल संस्था से जुड़ा है?',
      'No. BALLKNW is an independent, unofficial, fan-made project. It is not affiliated with, endorsed by, or connected to Sports Interactive, SEGA, EA Sports, FIFA, the Premier League, the English Football League, or any club or competition. All product names and trademarks belong to their respective owners. We use official data and names descriptively for gameplay, with proper attribution.':
        'नहीं। BALLKNW एक स्वतंत्र, ग़ैर-आधिकारिक, फ़ैन-निर्मित प्रोजेक्ट है। यह Sports Interactive, SEGA, EA Sports, FIFA, प्रीमियर लीग, इंग्लिश फुटबॉल लीग या किसी क्लब या प्रतियोगिता से संबद्ध, समर्थित या जुड़ा हुआ नहीं है। सभी उत्पाद नाम और ट्रेडमार्क उनके संबंधित स्वामियों के हैं। हम आधिकारिक डेटा और नाम गेमप्ले के लिए वर्णनात्मक रूप से, उचित श्रेय के साथ इस्तेमाल करते हैं।',

      '<div class="eyebrow">Before you go</div>': '<div class="eyebrow">जाने से पहले</div>',
      '<h2>Three games.<br>One tab. Still free.</h2>': '<h2>तीन गेम।<br>एक टैब। फिर भी मुफ़्त।</h2>',
      'Your save, streak and squad live in this browser — close the tab, come back, pick the season up where you left it.':
        'आपका सेव, स्ट्रीक और स्क्वाड इसी ब्राउज़र में रहते हैं — टैब बंद करें, लौटें, और सीज़न वहीं से उठाएँ जहाँ छोड़ा था।',
      '>Play Gaffa</a>': '>Gaffa खेलें</a>',
      '<span class="k">Career</span><span class="fx-name">Gaffa · full season</span>':
        '<span class="k">करियर</span><span class="fx-name">Gaffa · पूरा सीज़न</span>',
      '<span class="k">Draft</span><span class="fx-name">Draft XI · build a squad</span>':
        '<span class="k">ड्राफ्ट</span><span class="fx-name">Draft XI · स्क्वाड बनाएँ</span>',
      '<span class="k">Daily</span><span class="fx-name">Scout · today\'s puzzle</span>':
        '<span class="k">रोज़ाना</span><span class="fx-name">Scout · आज की पहेली</span>',
      '<span class="k">Guide</span><span class="fx-name">Tactics &amp; transfers</span>':
        '<span class="k">गाइड</span><span class="fx-name">रणनीति और ट्रांसफ़र</span>',
      '<span class="board-top-meta">Matchday hub</span>': '<span class="board-top-meta">मैचडे हब</span>',
      Advertisement: 'विज्ञापन',

      '<a href="/privacy.html">Privacy</a>': '<a href="/privacy.html">गोपनीयता</a>',
      '<a href="/terms.html">Terms</a>': '<a href="/terms.html">शर्तें</a>',
      '>Cookie settings</a>': '>कुकी सेटिंग्स</a>',
      '>Contact</a>': '>संपर्क</a>',
      'Made for football heads. Data from public sources. © BALLKNW · ballknw.com · Updated July 8, 2026':
        'फुटबॉल दीवानों के लिए बनाया गया। डेटा सार्वजनिक स्रोतों से। © BALLKNW · ballknw.com · 8 जुलाई 2026 को अपडेट किया गया',
      '>Explainers: <a': '>व्याख्या (अंग्रेज़ी में): <a',
      '>Guides: <a': '>गाइड (अंग्रेज़ी में): <a',
    },
  },

  {
    code: 'es',
    htmlLang: 'es',
    hreflang: 'es',
    dir: 'ltr',
    path: '/es/',
    ogLocale: 'es_ES',
    short: 'ES',
    changeLanguage: 'Cambiar idioma',
    gameNote: 'El juego está en inglés.',
    strings: {
      '<title>Free Football Manager Game Online | Play Gaffa - No Download</title>':
        '<title>Juego de Manager de Fútbol Gratis Online | Juega a Gaffa - Sin Descargas</title>',
      'Free football manager game online — manage a real club in your browser with no download or account. Plus draft XI and daily puzzles. Play Gaffa now, completely free.':
        'Juego de manager de fútbol gratis online: dirige un club real desde tu navegador, sin descargas ni cuenta. Además, draft XI y puzles diarios. Juega a Gaffa ya, totalmente gratis.',
      'free football manager, football manager game, free football manager online, play football manager free, football management game, browser football game, free football games':
        'manager de futbol gratis, juego de manager de futbol, simulador de futbol online, juego de entrenador de futbol, futbol manager gratis, juegos de futbol navegador',
      'Free Football Manager Game Online | Play Now in Your Browser':
        'Juego de Manager de Fútbol Gratis | Juega Ya en tu Navegador',
      'Play a free football manager game online. Manage a real English league club, run tactics and transfers — no download, no account needed.':
        'Juega gratis a un manager de fútbol online. Dirige un club real de la liga inglesa, ajusta tácticas y fichajes: sin descargas ni cuenta.',
      'Free Football Manager Game Online - Play Gaffa':
        'Juego de Manager de Fútbol Gratis - Juega a Gaffa',
      'Free football manager game online. Manage a real English league club in your browser — no download, no account, completely free.':
        'Juego de manager de fútbol gratis online. Dirige un club real de la liga inglesa en tu navegador: sin descargas, sin cuenta, totalmente gratis.',

      '&nbsp;playing now': '&nbsp;jugando ahora',
      '<h1>Free Football Manager<br><span class="grad">Play Online, No Download</span></h1>':
        '<h1>Manager de Fútbol Gratis<br><span class="grad">Juega Online, Sin Descargas</span></h1>',
      'A football management simulation, free and playable online. Take charge of a real English league club — set your tactics, sign players in the transfer market, and simulate a full season — all in your browser.':
        'Una simulación de gestión futbolística, gratis y jugable online. Ponte al mando de un club real de la liga inglesa: define tus tácticas, ficha jugadores en el mercado y simula una temporada completa, todo en tu navegador.',
      '>Play Gaffa ↓</a>': '>Juega a Gaffa ↓</a>',
      '<p class="subline">Free &middot; no account &middot; saves automatically</p>':
        '<p class="subline">Gratis &middot; sin cuenta &middot; se guarda solo</p>',

      '<div class="lbl">Players rated</div>': '<div class="lbl">Jugadores valorados</div>',
      '<div class="lbl">Leagues</div>': '<div class="lbl">Ligas</div>',
      '<div class="lbl">Real clubs</div>': '<div class="lbl">Clubes reales</div>',
      '<div class="num">Free</div>': '<div class="num">Gratis</div>',
      '<div class="lbl">No login</div>': '<div class="lbl">Sin registro</div>',

      '>Open full screen ↗</a>': '>Abrir a pantalla completa ↗</a>',
      '>Strategy guide</a>': '>Guía de estrategia</a>',

      '<div class="eyebrow">How it works</div>': '<div class="eyebrow">Cómo funciona</div>',
      '<h2>Four steps to kickoff</h2>': '<h2>Cuatro pasos hasta el pitido inicial</h2>',
      '<h3>Pick your club</h3>': '<h3>Elige tu club</h3>',
      'Choose from every club across three divisions, or let the game assign one.':
        'Escoge entre todos los clubes de tres divisiones, o deja que el juego te asigne uno.',
      '<h3>Set your tactics</h3>': '<h3>Define tus tácticas</h3>',
      'Formation, instructions, set pieces — build the way your team plays.':
        'Formación, instrucciones, balón parado: construye la forma de jugar de tu equipo.',
      '<h3>Work the market</h3>': '<h3>Muévete en el mercado</h3>',
      'Scout, negotiate and sign — all within a real wage and transfer budget.':
        'Ojea, negocia y ficha, siempre dentro de un presupuesto real de salarios y traspasos.',
      '<h3>Survive the board</h3>': '<h3>Sobrevive a la directiva</h3>',
      'Hit your season objectives or face the sack. Your save persists automatically.':
        'Cumple los objetivos de la temporada o te echan. Tu partida se guarda automáticamente.',

      '<div class="eyebrow">FAQ</div>': '<div class="eyebrow">Preguntas frecuentes</div>',
      '<h2>Quick answers</h2>': '<h2>Respuestas rápidas</h2>',
      'Are the BALLKNW football games really free?':
        '¿Los juegos de fútbol de BALLKNW son realmente gratis?',
      'Yes — every game on ballknw.com is 100% free to play in your browser. No account, no download, no paywall. The site is supported by light, consent-based advertising.':
        'Sí: todos los juegos de ballknw.com son 100% gratis y se juegan en el navegador. Sin cuenta, sin descargas, sin muros de pago. El sitio se financia con publicidad ligera y basada en el consentimiento.',
      'Do I need an account to play or save my progress?':
        '¿Necesito una cuenta para jugar o guardar mi progreso?',
      'No. Your Gaffa save, streaks and progress are stored in your browser automatically. Come back on the same device and browser and your game continues.':
        'No. Tu partida de Gaffa, tus rachas y tu progreso se guardan automáticamente en tu navegador. Vuelve con el mismo dispositivo y navegador y la partida continúa.',
      'What can I do in Gaffa?': '¿Qué puedo hacer en Gaffa?',
      'Pick a real English league club and manage it for a full season — tactics, transfers, contracts, cups and a youth academy. Your save lives in your browser.':
        'Elige un club real de la liga inglesa y dirígelo durante una temporada completa: tácticas, fichajes, contratos, copas y cantera. Tu partida vive en tu navegador.',
      'Where does the player and squad data come from?':
        '¿De dónde salen los datos de jugadores y plantillas?',
      'BALLKNW builds its squads from public football datasets — current-season club squads and every World Cup squad from 1930 through 2026. In-game ratings are our own stylized approximations for gameplay, not official figures from any ratings provider.':
        'BALLKNW construye sus plantillas a partir de conjuntos de datos públicos de fútbol: plantillas de clubes de la temporada actual y todas las plantillas de los Mundiales desde 1930 hasta 2026. Las valoraciones dentro del juego son aproximaciones estilizadas propias, no cifras oficiales de ningún proveedor de ratings.',
      'Is BALLKNW affiliated with FIFA, the Premier League or any official sports body?':
        '¿BALLKNW está afiliado a la FIFA, la Premier League o algún organismo oficial?',
      'No. BALLKNW is an independent, unofficial, fan-made project. It is not affiliated with, endorsed by, or connected to Sports Interactive, SEGA, EA Sports, FIFA, the Premier League, the English Football League, or any club or competition. All product names and trademarks belong to their respective owners. We use official data and names descriptively for gameplay, with proper attribution.':
        'No. BALLKNW es un proyecto independiente, no oficial y hecho por aficionados. No está afiliado, respaldado ni conectado con Sports Interactive, SEGA, EA Sports, la FIFA, la Premier League, la English Football League ni con ningún club o competición. Todos los nombres de productos y marcas pertenecen a sus respectivos propietarios. Usamos datos y nombres oficiales de forma descriptiva para el juego, con la atribución correspondiente.',

      '<div class="eyebrow">Before you go</div>': '<div class="eyebrow">Antes de irte</div>',
      '<h2>Three games.<br>One tab. Still free.</h2>':
        '<h2>Tres juegos.<br>Una pestaña. Siempre gratis.</h2>',
      'Your save, streak and squad live in this browser — close the tab, come back, pick the season up where you left it.':
        'Tu partida, tu racha y tu plantilla viven en este navegador: cierra la pestaña, vuelve y retoma la temporada donde la dejaste.',
      '>Play Gaffa</a>': '>Juega a Gaffa</a>',
      '<span class="k">Career</span><span class="fx-name">Gaffa · full season</span>':
        '<span class="k">Carrera</span><span class="fx-name">Gaffa · temporada completa</span>',
      '<span class="k">Draft</span><span class="fx-name">Draft XI · build a squad</span>':
        '<span class="k">Draft</span><span class="fx-name">Draft XI · monta tu plantilla</span>',
      '<span class="k">Daily</span><span class="fx-name">Scout · today\'s puzzle</span>':
        '<span class="k">Diario</span><span class="fx-name">Scout · puzle de hoy</span>',
      '<span class="k">Guide</span><span class="fx-name">Tactics &amp; transfers</span>':
        '<span class="k">Guía</span><span class="fx-name">Tácticas y fichajes</span>',
      '<span class="board-top-meta">Matchday hub</span>':
        '<span class="board-top-meta">Centro de jornada</span>',
      Advertisement: 'Publicidad',

      '<a href="/privacy.html">Privacy</a>': '<a href="/privacy.html">Privacidad</a>',
      '<a href="/terms.html">Terms</a>': '<a href="/terms.html">Términos</a>',
      '>Cookie settings</a>': '>Configuración de cookies</a>',
      '>Contact</a>': '>Contacto</a>',
      'Made for football heads. Data from public sources. © BALLKNW · ballknw.com · Updated July 8, 2026':
        'Hecho para los amantes del fútbol. Datos de fuentes públicas. © BALLKNW · ballknw.com · Actualizado el 8 de julio de 2026',
      '>Explainers: <a': '>Explicaciones (en inglés): <a',
      '>Guides: <a': '>Guías (en inglés): <a',
    },
  },

  {
    code: 'fr',
    htmlLang: 'fr',
    hreflang: 'fr',
    dir: 'ltr',
    path: '/fr/',
    ogLocale: 'fr_FR',
    short: 'FR',
    changeLanguage: 'Changer de langue',
    gameNote: 'Le jeu est en anglais.',
    strings: {
      '<title>Free Football Manager Game Online | Play Gaffa - No Download</title>':
        '<title>Jeu de Manager de Football Gratuit en Ligne | Jouez à Gaffa - Sans Téléchargement</title>',
      'Free football manager game online — manage a real club in your browser with no download or account. Plus draft XI and daily puzzles. Play Gaffa now, completely free.':
        'Jeu de manager de football gratuit en ligne : dirigez un vrai club depuis votre navigateur, sans téléchargement ni compte. Plus un draft XI et des énigmes quotidiennes. Jouez à Gaffa, c\'est gratuit.',
      'free football manager, football manager game, free football manager online, play football manager free, football management game, browser football game, free football games':
        'manager de football gratuit, jeu de manager de football, simulation football en ligne, jeu d\'entraineur de football, football manager gratuit, jeux de foot navigateur',
      'Free Football Manager Game Online | Play Now in Your Browser':
        'Jeu de Manager de Football Gratuit | Jouez dans Votre Navigateur',
      'Play a free football manager game online. Manage a real English league club, run tactics and transfers — no download, no account needed.':
        'Jouez gratuitement à un manager de football en ligne. Dirigez un vrai club anglais, réglez tactiques et transferts — sans téléchargement ni compte.',
      'Free Football Manager Game Online - Play Gaffa':
        'Jeu de Manager de Football Gratuit - Jouez à Gaffa',
      'Free football manager game online. Manage a real English league club in your browser — no download, no account, completely free.':
        'Jeu de manager de football gratuit en ligne. Dirigez un vrai club anglais dans votre navigateur — sans téléchargement, sans compte, entièrement gratuit.',

      '&nbsp;playing now': '&nbsp;joueurs en ce moment',
      '<h1>Free Football Manager<br><span class="grad">Play Online, No Download</span></h1>':
        '<h1>Manager de Football Gratuit<br><span class="grad">Jouez en Ligne, Sans Téléchargement</span></h1>',
      'A football management simulation, free and playable online. Take charge of a real English league club — set your tactics, sign players in the transfer market, and simulate a full season — all in your browser.':
        'Une simulation de gestion de football, gratuite et jouable en ligne. Prenez les commandes d\'un vrai club anglais : réglez vos tactiques, recrutez sur le marché des transferts et simulez une saison entière — le tout dans votre navigateur.',
      '>Play Gaffa ↓</a>': '>Jouer à Gaffa ↓</a>',
      '<p class="subline">Free &middot; no account &middot; saves automatically</p>':
        '<p class="subline">Gratuit &middot; sans compte &middot; sauvegarde automatique</p>',

      '<div class="lbl">Players rated</div>': '<div class="lbl">Joueurs notés</div>',
      '<div class="lbl">Leagues</div>': '<div class="lbl">Championnats</div>',
      '<div class="lbl">Real clubs</div>': '<div class="lbl">Clubs réels</div>',
      '<div class="num">Free</div>': '<div class="num">Gratuit</div>',
      '<div class="lbl">No login</div>': '<div class="lbl">Sans inscription</div>',

      '>Open full screen ↗</a>': '>Ouvrir en plein écran ↗</a>',
      '>Strategy guide</a>': '>Guide stratégique</a>',

      '<div class="eyebrow">How it works</div>': '<div class="eyebrow">Comment ça marche</div>',
      '<h2>Four steps to kickoff</h2>': '<h2>Quatre étapes avant le coup d\'envoi</h2>',
      '<h3>Pick your club</h3>': '<h3>Choisissez votre club</h3>',
      'Choose from every club across three divisions, or let the game assign one.':
        'Choisissez parmi tous les clubs de trois divisions, ou laissez le jeu vous en attribuer un.',
      '<h3>Set your tactics</h3>': '<h3>Réglez vos tactiques</h3>',
      'Formation, instructions, set pieces — build the way your team plays.':
        'Formation, consignes, coups de pied arrêtés — façonnez le jeu de votre équipe.',
      '<h3>Work the market</h3>': '<h3>Travaillez le marché</h3>',
      'Scout, negotiate and sign — all within a real wage and transfer budget.':
        'Repérez, négociez et signez — toujours dans les limites d\'un vrai budget salaires et transferts.',
      '<h3>Survive the board</h3>': '<h3>Survivez au conseil</h3>',
      'Hit your season objectives or face the sack. Your save persists automatically.':
        'Atteignez vos objectifs de saison ou prenez la porte. Votre partie est sauvegardée automatiquement.',

      '<div class="eyebrow">FAQ</div>': '<div class="eyebrow">FAQ</div>',
      '<h2>Quick answers</h2>': '<h2>Réponses rapides</h2>',
      'Are the BALLKNW football games really free?':
        'Les jeux de football BALLKNW sont-ils vraiment gratuits ?',
      'Yes — every game on ballknw.com is 100% free to play in your browser. No account, no download, no paywall. The site is supported by light, consent-based advertising.':
        'Oui — tous les jeux de ballknw.com sont 100 % gratuits, directement dans votre navigateur. Sans compte, sans téléchargement, sans paywall. Le site est financé par une publicité légère et soumise à votre consentement.',
      'Do I need an account to play or save my progress?':
        'Faut-il un compte pour jouer ou sauvegarder ma progression ?',
      'No. Your Gaffa save, streaks and progress are stored in your browser automatically. Come back on the same device and browser and your game continues.':
        'Non. Votre partie Gaffa, vos séries et votre progression sont enregistrées automatiquement dans votre navigateur. Revenez sur le même appareil et le même navigateur, et la partie reprend.',
      'What can I do in Gaffa?': 'Que peut-on faire dans Gaffa ?',
      'Pick a real English league club and manage it for a full season — tactics, transfers, contracts, cups and a youth academy. Your save lives in your browser.':
        'Choisissez un vrai club anglais et dirigez-le sur une saison complète : tactiques, transferts, contrats, coupes et centre de formation. Votre partie vit dans votre navigateur.',
      'Where does the player and squad data come from?':
        'D\'où viennent les données des joueurs et des effectifs ?',
      'BALLKNW builds its squads from public football datasets — current-season club squads and every World Cup squad from 1930 through 2026. In-game ratings are our own stylized approximations for gameplay, not official figures from any ratings provider.':
        'BALLKNW construit ses effectifs à partir de jeux de données publics : les effectifs des clubs de la saison en cours et toutes les sélections de Coupe du monde de 1930 à 2026. Les notes en jeu sont nos propres approximations stylisées, pas des chiffres officiels d\'un fournisseur de notes.',
      'Is BALLKNW affiliated with FIFA, the Premier League or any official sports body?':
        'BALLKNW est-il affilié à la FIFA, à la Premier League ou à un organisme officiel ?',
      'No. BALLKNW is an independent, unofficial, fan-made project. It is not affiliated with, endorsed by, or connected to Sports Interactive, SEGA, EA Sports, FIFA, the Premier League, the English Football League, or any club or competition. All product names and trademarks belong to their respective owners. We use official data and names descriptively for gameplay, with proper attribution.':
        'Non. BALLKNW est un projet indépendant, non officiel, réalisé par des fans. Il n\'est ni affilié, ni approuvé, ni lié à Sports Interactive, SEGA, EA Sports, la FIFA, la Premier League, l\'English Football League, ni à aucun club ou compétition. Tous les noms de produits et marques appartiennent à leurs propriétaires respectifs. Nous utilisons les données et les noms officiels de manière descriptive pour le jeu, avec les attributions qui conviennent.',

      '<div class="eyebrow">Before you go</div>': '<div class="eyebrow">Avant de partir</div>',
      '<h2>Three games.<br>One tab. Still free.</h2>':
        '<h2>Trois jeux.<br>Un onglet. Toujours gratuit.</h2>',
      'Your save, streak and squad live in this browser — close the tab, come back, pick the season up where you left it.':
        'Votre partie, votre série et votre effectif vivent dans ce navigateur — fermez l\'onglet, revenez, et reprenez la saison là où vous l\'aviez laissée.',
      '>Play Gaffa</a>': '>Jouer à Gaffa</a>',
      '<span class="k">Career</span><span class="fx-name">Gaffa · full season</span>':
        '<span class="k">Carrière</span><span class="fx-name">Gaffa · saison complète</span>',
      '<span class="k">Draft</span><span class="fx-name">Draft XI · build a squad</span>':
        '<span class="k">Draft</span><span class="fx-name">Draft XI · composez votre équipe</span>',
      '<span class="k">Daily</span><span class="fx-name">Scout · today\'s puzzle</span>':
        '<span class="k">Quotidien</span><span class="fx-name">Scout · l\'énigme du jour</span>',
      '<span class="k">Guide</span><span class="fx-name">Tactics &amp; transfers</span>':
        '<span class="k">Guide</span><span class="fx-name">Tactiques et transferts</span>',
      '<span class="board-top-meta">Matchday hub</span>':
        '<span class="board-top-meta">Centre de match</span>',
      Advertisement: 'Publicité',

      '<a href="/privacy.html">Privacy</a>': '<a href="/privacy.html">Confidentialité</a>',
      '<a href="/terms.html">Terms</a>': '<a href="/terms.html">Conditions</a>',
      '>Cookie settings</a>': '>Paramètres des cookies</a>',
      '>Contact</a>': '>Contact</a>',
      'Made for football heads. Data from public sources. © BALLKNW · ballknw.com · Updated July 8, 2026':
        'Fait pour les passionnés de football. Données issues de sources publiques. © BALLKNW · ballknw.com · Mis à jour le 8 juillet 2026',
      '>Explainers: <a': '>Explications (en anglais) : <a',
      '>Guides: <a': '>Guides (en anglais) : <a',
    },
  },

  {
    code: 'ar',
    htmlLang: 'ar',
    hreflang: 'ar',
    dir: 'rtl',
    path: '/ar/',
    ogLocale: 'ar_AR',
    short: 'AR',
    changeLanguage: 'تغيير اللغة',
    gameNote: 'واجهة اللعبة باللغة الإنجليزية.',
    strings: {
      '<title>Free Football Manager Game Online | Play Gaffa - No Download</title>':
        '<title>لعبة مدير كرة قدم مجانية أونلاين | العب Gaffa - بدون تحميل</title>',
      'Free football manager game online — manage a real club in your browser with no download or account. Plus draft XI and daily puzzles. Play Gaffa now, completely free.':
        'لعبة مدير كرة قدم مجانية أونلاين — درّب نادياً حقيقياً من متصفحك، بدون تحميل وبدون حساب. بالإضافة إلى تشكيلة الدرافت وألغاز يومية. العب Gaffa الآن مجاناً بالكامل.',
      'free football manager, football manager game, free football manager online, play football manager free, football management game, browser football game, free football games':
        'مدير كرة قدم مجاني, لعبة مدير كرة قدم, لعبة كرة قدم أونلاين, لعبة إدارة كرة القدم, ألعاب كرة قدم في المتصفح, ألعاب كرة قدم مجانية',
      'Free Football Manager Game Online | Play Now in Your Browser':
        'لعبة مدير كرة قدم مجانية | العب الآن من متصفحك',
      'Play a free football manager game online. Manage a real English league club, run tactics and transfers — no download, no account needed.':
        'العب لعبة مدير كرة قدم مجانية أونلاين. درّب نادياً إنجليزياً حقيقياً، وضع الخطط وأبرم الصفقات — بدون تحميل وبدون حساب.',
      'Free Football Manager Game Online - Play Gaffa': 'لعبة مدير كرة قدم مجانية - العب Gaffa',
      'Free football manager game online. Manage a real English league club in your browser — no download, no account, completely free.':
        'لعبة مدير كرة قدم مجانية أونلاين. درّب نادياً إنجليزياً حقيقياً من متصفحك — بدون تحميل، بدون حساب، مجاناً بالكامل.',

      '&nbsp;playing now': '&nbsp;يلعبون الآن',
      '<h1>Free Football Manager<br><span class="grad">Play Online, No Download</span></h1>':
        '<h1>مدير كرة قدم مجاني<br><span class="grad">العب أونلاين بدون تحميل</span></h1>',
      'A football management simulation, free and playable online. Take charge of a real English league club — set your tactics, sign players in the transfer market, and simulate a full season — all in your browser.':
        'محاكاة لإدارة كرة القدم، مجانية وتُلعب أونلاين. تولَّ قيادة نادٍ إنجليزي حقيقي — ضع خططك، وتعاقد مع اللاعبين في سوق الانتقالات، وحاكِ موسماً كاملاً — كل ذلك من متصفحك.',
      '>Play Gaffa ↓</a>': '>العب Gaffa ↓</a>',
      '<p class="subline">Free &middot; no account &middot; saves automatically</p>':
        '<p class="subline">مجاناً &middot; بدون حساب &middot; حفظ تلقائي</p>',

      '<div class="lbl">Players rated</div>': '<div class="lbl">لاعب مُقيَّم</div>',
      '<div class="lbl">Leagues</div>': '<div class="lbl">دوري</div>',
      '<div class="lbl">Real clubs</div>': '<div class="lbl">نادٍ حقيقي</div>',
      '<div class="num">Free</div>': '<div class="num">مجاناً</div>',
      '<div class="lbl">No login</div>': '<div class="lbl">بدون تسجيل</div>',

      '>Open full screen ↗</a>': '>فتح بملء الشاشة ↗</a>',
      '>Strategy guide</a>': '>دليل الاستراتيجية</a>',

      '<div class="eyebrow">How it works</div>': '<div class="eyebrow">كيف تعمل اللعبة</div>',
      '<h2>Four steps to kickoff</h2>': '<h2>أربع خطوات حتى صافرة البداية</h2>',
      '<h3>Pick your club</h3>': '<h3>اختر ناديك</h3>',
      'Choose from every club across three divisions, or let the game assign one.':
        'اختر من بين كل أندية الدرجات الثلاث، أو دع اللعبة تختار لك.',
      '<h3>Set your tactics</h3>': '<h3>ضع خططك</h3>',
      'Formation, instructions, set pieces — build the way your team plays.':
        'التشكيل والتعليمات والكرات الثابتة — ابنِ أسلوب لعب فريقك.',
      '<h3>Work the market</h3>': '<h3>تحرّك في سوق الانتقالات</h3>',
      'Scout, negotiate and sign — all within a real wage and transfer budget.':
        'راقب وفاوض وتعاقد — ضمن ميزانية رواتب وانتقالات واقعية.',
      '<h3>Survive the board</h3>': '<h3>انجُ من مجلس الإدارة</h3>',
      'Hit your season objectives or face the sack. Your save persists automatically.':
        'حقّق أهداف الموسم أو ستُقال. تُحفظ لعبتك تلقائياً.',

      '<div class="eyebrow">FAQ</div>': '<div class="eyebrow">الأسئلة الشائعة</div>',
      '<h2>Quick answers</h2>': '<h2>إجابات سريعة</h2>',
      'Are the BALLKNW football games really free?': 'هل ألعاب كرة القدم في BALLKNW مجانية فعلاً؟',
      'Yes — every game on ballknw.com is 100% free to play in your browser. No account, no download, no paywall. The site is supported by light, consent-based advertising.':
        'نعم — كل لعبة على ballknw.com مجانية 100% وتُلعب من المتصفح. بدون حساب، وبدون تحميل، وبدون اشتراك مدفوع. يعتمد الموقع على إعلانات خفيفة قائمة على موافقتك.',
      'Do I need an account to play or save my progress?': 'هل أحتاج إلى حساب للعب أو لحفظ تقدّمي؟',
      'No. Your Gaffa save, streaks and progress are stored in your browser automatically. Come back on the same device and browser and your game continues.':
        'لا. تُحفظ لعبتك في Gaffa وسلاسل انتصاراتك وتقدّمك تلقائياً في متصفحك. عُد من الجهاز والمتصفح نفسيهما وستُكمل من حيث توقفت.',
      'What can I do in Gaffa?': 'ما الذي يمكنني فعله في Gaffa؟',
      'Pick a real English league club and manage it for a full season — tactics, transfers, contracts, cups and a youth academy. Your save lives in your browser.':
        'اختر نادياً إنجليزياً حقيقياً وأدِرْه موسماً كاملاً — الخطط والانتقالات والعقود والكؤوس وأكاديمية الشباب. تبقى لعبتك محفوظة في متصفحك.',
      'Where does the player and squad data come from?': 'من أين تأتي بيانات اللاعبين والتشكيلات؟',
      'BALLKNW builds its squads from public football datasets — current-season club squads and every World Cup squad from 1930 through 2026. In-game ratings are our own stylized approximations for gameplay, not official figures from any ratings provider.':
        'يبني BALLKNW تشكيلاته من مجموعات بيانات كروية عامة — تشكيلات أندية الموسم الحالي وكل تشكيلات كأس العالم من 1930 حتى 2026. أما التقييمات داخل اللعبة فهي تقديرات أسلوبية من عندنا لأغراض اللعب، وليست أرقاماً رسمية من أي جهة تقييم.',
      'Is BALLKNW affiliated with FIFA, the Premier League or any official sports body?':
        'هل يرتبط BALLKNW بالفيفا أو الدوري الإنجليزي الممتاز أو أي جهة رياضية رسمية؟',
      'No. BALLKNW is an independent, unofficial, fan-made project. It is not affiliated with, endorsed by, or connected to Sports Interactive, SEGA, EA Sports, FIFA, the Premier League, the English Football League, or any club or competition. All product names and trademarks belong to their respective owners. We use official data and names descriptively for gameplay, with proper attribution.':
        'لا. BALLKNW مشروع مستقل غير رسمي من صنع المشجعين. وهو غير مرتبط بـ Sports Interactive أو SEGA أو EA Sports أو الفيفا أو الدوري الإنجليزي الممتاز أو رابطة الدوري الإنجليزي أو أي نادٍ أو مسابقة، ولا يحظى بموافقتها أو رعايتها. جميع أسماء المنتجات والعلامات التجارية ملك لأصحابها. نستخدم البيانات والأسماء الرسمية بشكل وصفي لأغراض اللعب مع الإشارة إلى مصادرها.',

      '<div class="eyebrow">Before you go</div>': '<div class="eyebrow">قبل أن تذهب</div>',
      '<h2>Three games.<br>One tab. Still free.</h2>':
        '<h2>ثلاث ألعاب.<br>تبويب واحد. ومجاناً دائماً.</h2>',
      'Your save, streak and squad live in this browser — close the tab, come back, pick the season up where you left it.':
        'لعبتك وسلسلة انتصاراتك وتشكيلتك محفوظة في هذا المتصفح — أغلق التبويب، ثم عُد وأكمل الموسم من حيث توقفت.',
      '>Play Gaffa</a>': '>العب Gaffa</a>',
      '<span class="k">Career</span><span class="fx-name">Gaffa · full season</span>':
        '<span class="k">مسيرة</span><span class="fx-name">Gaffa · موسم كامل</span>',
      '<span class="k">Draft</span><span class="fx-name">Draft XI · build a squad</span>':
        '<span class="k">درافت</span><span class="fx-name">Draft XI · كوّن تشكيلتك</span>',
      '<span class="k">Daily</span><span class="fx-name">Scout · today\'s puzzle</span>':
        '<span class="k">يومي</span><span class="fx-name">Scout · لغز اليوم</span>',
      '<span class="k">Guide</span><span class="fx-name">Tactics &amp; transfers</span>':
        '<span class="k">دليل</span><span class="fx-name">الخطط والانتقالات</span>',
      '<span class="board-top-meta">Matchday hub</span>':
        '<span class="board-top-meta">مركز المباريات</span>',
      Advertisement: 'إعلان',

      '<a href="/privacy.html">Privacy</a>': '<a href="/privacy.html">الخصوصية</a>',
      '<a href="/terms.html">Terms</a>': '<a href="/terms.html">الشروط</a>',
      '>Cookie settings</a>': '>إعدادات الكوكيز</a>',
      '>Contact</a>': '>اتصل بنا</a>',
      'Made for football heads. Data from public sources. © BALLKNW · ballknw.com · Updated July 8, 2026':
        'صُنع لعشاق كرة القدم. البيانات من مصادر عامة. © BALLKNW · ballknw.com · تم التحديث في 8 يوليو 2026',
      '>Explainers: <a': '>شروحات (بالإنجليزية): <a',
      '>Guides: <a': '>أدلة (بالإنجليزية): <a',
    },
  },
];
