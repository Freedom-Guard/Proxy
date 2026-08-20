tailwind.config = {
    darkMode: 'class',
    safelist: [
        'dark:bg-gray-900',
        'dark:text-gray-100',
        'dark:bg-gray-700',
        'dark:bg-red-900',
        'dark:text-red-300',
        'dark:hover:bg-gray-600',
        'dark:hover:bg-blue-600',
        'dark:bg-purple-500',
        'dark:hover:bg-purple-600'
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    const mainURLs = [
        'https://mhditaheri.github.io/ProxyCollector/proxy.txt#MHD GH',
        'https://raw.githubusercontent.com/ALIILAPRO/MTProtoProxy/main/proxies.json#LAPRO GH',
        'https://raw.githubusercontent.com/Freedom-Guard-Builder/Freedom-Finder/refs/heads/main/out/configs/proxies.txt#Freedom Finder',
        'https://raw.githubusercontent.com/kort0881/telegram-proxy-collector/refs/heads/main/proxy_all.txt#Kort GH',
        'https://raw.githubusercontent.com/Maxsool/MTProxyCollector/refs/heads/main/proxy.txt#MAX GH'
    ];

    const backupURL = 'https://req.freedomguard.workers.dev/';
    const batchSize = 100;
    const cacheName = 'proxy-sources-v1';
    const cacheMaxAge = 60 * 60 * 1000;
    const cacheKeyPrefix = 'proxy-cache-time:';

    let proxies = [];
    let backUpProxies = [];
    let renderedCount = 0;
    let sourceProxies = new Map();
    let sourceModes = new Map();
    let pendingSources = 0;
    let renderToken = 0;
    let fetchRunId = 0;

    const loadStatus = document.getElementById('load-status');
    const loadMoreBtn = document.getElementById('load-more');
    const proxyList = document.getElementById('proxy-list');
    const errorBox = document.getElementById('error');
    const sortProxiesBtn = document.getElementById('sort-proxies');
    const sortStatus = document.getElementById('sort-status');

    let sortAscending = true;

    const storedTheme = localStorage.getItem('theme');

    if (
        storedTheme === 'dark' ||
        (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    proxyList.addEventListener('click', handleProxyListClick);
    loadMoreBtn?.addEventListener('click', renderNextBatch);

    sortProxiesBtn?.addEventListener('click', () => {
        if (proxies.length === 0) {
            const err = document.getElementById('error');

            err.textContent = 'ابتدا پروکسی‌ها را دریافت کنید!';
            err.classList.remove('hidden');

            return;
        }

        sortAscending = !sortAscending;

        proxies = sortByLatency(proxies);
        renderedCount = 0;

        proxyList.innerHTML = '';

        updateSortUI();
        renderNextBatch();
    });

    function debounce(func, wait) {
        let timeout;

        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    function escapeHTML(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeLatency(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return null;
        }

        return Math.round(number);
    }

    function formatLatency(value) {
        const latency = normalizeLatency(value);

        if (latency === null) {
            return 'نامشخص';
        }

        if (latency <= 60) {
            return `${latency} ms`;
        }

        if (latency <= 120) {
            return `${latency} ms`;
        }

        return `${latency} ms`;
    }

    function sortByLatency(list) {
        return [...list].sort((a, b) => {
            const latencyA = normalizeLatency(a.latency);
            const latencyB = normalizeLatency(b.latency);

            if (latencyA === null && latencyB === null) {
                return 0;
            }

            if (latencyA === null) {
                return 1;
            }

            if (latencyB === null) {
                return -1;
            }

            return sortAscending
                ? latencyA - latencyB
                : latencyB - latencyA;
        });
    }

    function buildTelegramLink(proxy) {
        if (proxy.connect_url) {
            return proxy.connect_url;
        }

        if (proxy.link && proxy.link.startsWith('https://t.me/proxy?')) {
            return proxy.link;
        }

        if (!proxy.host || !proxy.port || !proxy.secret) {
            return '';
        }

        const params = new URLSearchParams({
            server: proxy.host,
            port: proxy.port,
            secret: proxy.secret
        });

        return `tg://proxy?${params.toString()}`;
    }

    function normalizeJSONProxy(proxy, index) {
        const host = proxy.host ?? proxy.address ?? proxy.server ?? '';
        const port = proxy.port ?? '';
        const secret = proxy.secret ?? '';

        const connectURL = buildTelegramLink({
            ...proxy,
            host,
            port,
            secret
        });

        const latency = normalizeLatency(
            proxy.latency ??
            proxy.ping ??
            proxy.delay ??
            proxy.response_time
        );

        const operator = proxy.operator && typeof proxy.operator === 'object'
            ? proxy.operator
            : {};

        return {
            id: `json-${index}-${host}-${port}`,
            sourceType: 'json',
            host,
            address: host,
            port,
            secret,
            connect_url: connectURL,
            link: connectURL,
            latency,
            operator: {
                mci: normalizeLatency(operator.mci),
                irancell: normalizeLatency(operator.irancell),
                fixed: normalizeLatency(operator.fixed),
                rightel: normalizeLatency(operator.rightel)
            },
            status: proxy.status || 'active',
            name: proxy.name || `پروکسی ${index + 1}`
        };
    }

    function normalizeTXTProxy(line, index) {
        const cleanLine = line.trim();

        if (!cleanLine) {
            return null;
        }

        if (
            cleanLine.startsWith('http://') ||
            cleanLine.startsWith('https://')
        ) {
            return {
                id: `txt-${index}`,
                sourceType: 'txt',
                address: cleanLine,
                host: cleanLine,
                port: '',
                secret: '',
                connect_url: cleanLine,
                link: cleanLine,
                latency: null,
                operator: {},
                status: 'active',
                name: `پروکسی ${index + 1}`
            };
        }

        const parts = cleanLine.split(':');
        const address = parts.shift() || '';
        const port = parts.join(':') || '';

        return {
            id: `txt-${index}`,
            sourceType: 'txt',
            address,
            host: address,
            port,
            secret: '',
            connect_url: '',
            link: cleanLine,
            latency: null,
            operator: {},
            status: 'active',
            name: `پروکسی ${index + 1}`
        };
    }

    function parseProxyData(data, sourceURL) {
        const trimmed = data.trim();

        if (!trimmed) {
            return [];
        }

        const isJSON =
            sourceURL.toLowerCase().includes('.json') ||
            trimmed.startsWith('[') ||
            trimmed.startsWith('{');

        if (isJSON) {
            try {
                const parsed = JSON.parse(trimmed);

                let items = [];

                if (Array.isArray(parsed)) {
                    items = parsed;
                } else if (Array.isArray(parsed.proxies)) {
                    items = parsed.proxies;
                } else if (Array.isArray(parsed.data)) {
                    items = parsed.data;
                } else if (
                    parsed.host ||
                    parsed.server ||
                    parsed.address
                ) {
                    items = [parsed];
                }

                return items
                    .filter(item => item && typeof item === 'object')
                    .map((item, index) =>
                        normalizeJSONProxy(item, index)
                    );
            } catch {
                return [];
            }
        }

        return trimmed
            .split(/\r?\n/)
            .map((line, index) =>
                normalizeTXTProxy(line, index)
            )
            .filter(Boolean);
    }

    function getCacheTimeKey(url) {
        return `${cacheKeyPrefix}${url}`;
    }

    async function getCachedSource(url) {
        try {
            if (!('caches' in window)) {
                return null;
            }

            const cache = await caches.open(cacheName);
            const response = await cache.match(url);

            if (!response) {
                return null;
            }

            const timestamp = Number(
                localStorage.getItem(getCacheTimeKey(url)) || 0
            );

            const data = await response.text();

            if (!data.trim()) {
                return null;
            }

            return {
                data,
                timestamp,
                age: timestamp > 0
                    ? Date.now() - timestamp
                    : Infinity
            };
        } catch {
            return null;
        }
    }

    async function setCachedSource(url, data) {
        try {
            if (!('caches' in window)) {
                return;
            }

            const cache = await caches.open(cacheName);

            await cache.put(
                url,
                new Response(data, {
                    headers: {
                        'Content-Type': 'text/plain;charset=UTF-8'
                    }
                })
            );

            localStorage.setItem(
                getCacheTimeKey(url),
                String(Date.now())
            );
        } catch { }
    }

    async function fetchSource(url) {
        try {
            const response = await fetch(url, {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.text();

            await setCachedSource(url, data);

            return data;
        } catch (error) {
            if (!url.toLowerCase().includes('.json')) {
                try {
                    const backupResponse = await fetch(backupURL, {
                        cache: 'no-store'
                    });

                    if (backupResponse.ok) {
                        const data = await backupResponse.text();

                        await setCachedSource(url, data);

                        return data;
                    }
                } catch { }
            }

            throw error;
        }
    }

    function getSourceLabel() {
        const modes = [...sourceModes.values()];

        if (modes.length === 0) {
            return 'در انتظار دریافت...';
        }

        const cacheCount = modes.filter(mode =>
            mode === 'cache'
        ).length;

        const onlineCount = modes.filter(mode =>
            mode === 'online'
        ).length;

        if (cacheCount > 0 && onlineCount > 0) {
            return 'کش و آنلاین';
        }

        if (cacheCount > 0) {
            return 'کش';
        }

        if (onlineCount > 0) {
            return 'آنلاین';
        }

        return 'در انتظار دریافت...';
    }

    function updateLoadStatus() {
        if (proxies.length === 0 && pendingSources === 0) {
            loadStatus.textContent = '';
            return;
        }

        const sourceLabel = getSourceLabel();

        if (pendingSources > 0) {
            loadStatus.textContent =
                `نمایش از ${sourceLabel}: ${renderedCount} از ${proxies.length} پروکسی | ${pendingSources} پروکسی منبع در حال دریافت...`;
        } else {
            loadStatus.textContent =
                `نمایش از ${sourceLabel}: ${Math.min(
                    renderedCount,
                    proxies.length
                )} از ${proxies.length} پروکسی`;
        }
    }

    function rebuildProxiesFromSources(sourceName) {
        const allProxies = [];

        sourceProxies.forEach(list => {
            allProxies.push(...list);
        });

        const uniqueProxies = [];
        const seen = new Set();

        allProxies.forEach(proxy => {
            const key =
                proxy.connect_url ||
                `${proxy.address}:${proxy.port}:${proxy.secret}`;

            if (!seen.has(key)) {
                seen.add(key);
                uniqueProxies.push(proxy);
            }
        });

        proxies = sortByLatency(uniqueProxies);

        renderedCount = 0;
        renderToken += 1;

        proxyList.innerHTML = '';

        updateSortUI();
        renderNextBatch(sourceName);

        document.querySelectorAll(
            '.sort-btn, .sort-indicator'
        ).forEach(el => {
            el.style = 'display:inline-flex;';
        });

        updateLoadStatus();
    }

    function displayProxies(listData) {
        if (!listData || listData.length === 0) {
            errorBox.textContent = 'پروکسی یافت نشد!';
            errorBox.classList.remove('hidden');
            proxyList.innerHTML = '';
            loadStatus.textContent = '';
            loadMoreBtn?.classList.add('hidden');
            return;
        }

        errorBox.classList.add('hidden');

        proxies = sortByLatency(listData);
        renderedCount = 0;

        proxyList.innerHTML = '';

        updateSortUI();
        renderNextBatch();

        document.querySelectorAll(
            '.sort-btn, .sort-indicator'
        ).forEach(el => {
            el.style = 'display:inline-flex;';
        });
    }

    function updateSortUI() {
        if (!sortStatus || !sortProxiesBtn) {
            return;
        }

        if (sortAscending) {
            sortStatus.textContent = 'پینگ: کم به زیاد';

            sortProxiesBtn.innerHTML = `
                <svg class="control-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 6h18M6 12h12m-9 6h6" />
                </svg>
                مرتب‌سازی پینگ: کم به زیاد
            `;
        } else {
            sortStatus.textContent = 'پینگ: زیاد به کم';

            sortProxiesBtn.innerHTML = `
                <svg class="control-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 18h18M6 12h12m-9-6h6" />
                </svg>
                مرتب‌سازی پینگ: زیاد به کم
            `;
        }
    }

    function renderNextBatch(sourceName = "FG") {
        if (renderedCount >= proxies.length) {
            return;
        }

        const token = renderToken;

        const nextChunk = proxies.slice(
            renderedCount,
            renderedCount + batchSize
        );

        renderedCount += nextChunk.length;

        requestAnimationFrame(() => {
            if (token !== renderToken) {
                return;
            }

            appendProxies(nextChunk, sourceName);
            updateLoadStatus();

            if (renderedCount >= proxies.length) {
                loadMoreBtn?.classList.add('hidden');
            } else {
                loadMoreBtn?.classList.remove('hidden');
            }
        });
    }

    function getLatencyClass(latency) {
        if (latency === null) {
            return 'latency-unknown';
        }

        if (latency <= 60) {
            return 'latency-good';
        }

        if (latency <= 120) {
            return 'latency-medium';
        }

        return 'latency-bad';
    }

    function operatorRow(title, value) {
        const latency = normalizeLatency(value);
        const display =
            latency === null
                ? '—'
                : `${latency} ms`;

        return `
            <div class="operator-item">
                <span class="operator-name">
                    ${escapeHTML(title)}
                </span>
                <span class="operator-ping ${getLatencyClass(latency)}">
                    ${display}
                </span>
            </div>
        `;
    }

    function appendProxies(items, sourceName = "FG") {
        const fragment =
            document.createDocumentFragment();

        items.forEach(proxy => {
            const card = document.createElement('div');

            card.className =
                'proxy-card bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1';

            const address =
                proxy.address ||
                proxy.host ||
                '';

            const port =
                proxy.port ||
                '';

            const displayAddress = port
                ? `${address}:${port}`
                : address;

            const latency =
                normalizeLatency(proxy.latency);

            const hasOperators =
                proxy.operator &&
                Object.values(proxy.operator).some(
                    value =>
                        normalizeLatency(value) !== null
                );

            const isJSON =
                proxy.sourceType === 'json';

            const sourceMode =
                proxy.sourceMode === 'cache'
                    ? 'کش'
                    : 'آنلاین';

            card.innerHTML = `
                <div class="proxy-card-header">
                    <div class="proxy-title-area">
                        <div class="proxy-title-line">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-gray-100">
                                ${escapeHTML(proxy.name)}
                            </h3>

                            <span class="proxy-source-badge ${isJSON ? 'json-badge' : 'txt-badge'}">
                                ${sourceName ?? "FG"}
                            </span>

                            <span class="proxy-source-badge">
                                ${sourceMode}
                            </span>
                        </div>

                        <p class="proxy-address" dir="ltr">
                            ${escapeHTML(displayAddress)}
                        </p>
                    </div>

                    <span class="proxy-status ${proxy.status === 'active' ? 'active-status' : 'inactive-status'}">
                        ${proxy.status === 'active' ? 'فعال' : 'غیرفعال'}
                    </span>
                </div>

                ${isJSON
                    ? `
                    <div class="proxy-main-info">
                        <div class="info-box">
                            <span class="info-label">Host</span>
                            <span class="info-value" dir="ltr">
                                ${escapeHTML(proxy.host || '—')}
                            </span>
                        </div>

                        <div class="info-box">
                            <span class="info-label">Port</span>
                            <span class="info-value" dir="ltr">
                                ${escapeHTML(proxy.port || '—')}
                            </span>
                        </div>

                        <div class="info-box latency-box">
                            <span class="info-label">Ping</span>
                            <span class="info-value ${getLatencyClass(latency)}">
                                ${formatLatency(latency)}
                            </span>
                        </div>
                    </div>

                    ${hasOperators
                        ? `
                        <div class="operators-section">
                            <div class="section-title">
                                <span>پینگ اپراتورها</span>
                            </div>

                            <div class="operators-grid">
                                ${operatorRow(
                            'همراه اول',
                            proxy.operator.mci
                        )}

                                ${operatorRow(
                            'ایرانسل',
                            proxy.operator.irancell
                        )}

                                ${operatorRow(
                            'ثابت',
                            proxy.operator.fixed
                        )}

                                ${operatorRow(
                            'رایتل',
                            proxy.operator.rightel
                        )}
                            </div>
                        </div>
                        `
                        : ''
                    }

                    ${proxy.secret
                        ? `
                        <div class="secret-box">
                            <span class="info-label">Secret</span>
                            <span class="secret-value" dir="ltr">
                                ${escapeHTML(proxy.secret)}
                            </span>
                        </div>
                        `
                        : ''
                    }

                    ${proxy.connect_url
                        ? `
                        <div class="connect-url-box">
                            <span class="info-label">لینک اتصال</span>
                            <p dir="ltr">
                                ${escapeHTML(proxy.connect_url)}
                            </p>
                        </div>
                        `
                        : ''
                    }
                    `
                    : ''
                }

                <div class="proxy-actions">
                    <button
                        class="copy-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                        data-clipboard="${escapeHTML(displayAddress)}">
                        کپی آدرس
                    </button>

                    <button
                        class="connect-btn bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition"
                        data-link="${escapeHTML(proxy.link || proxy.connect_url || '')}"
                        data-proxy-address="${escapeHTML(displayAddress)}">
                        اتصال
                    </button>

                    <button
                        class="report-btn bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                        data-proxy="${escapeHTML(displayAddress)}">
                        گزارش
                    </button>
                </div>
            `;

            fragment.appendChild(card);
        });

        proxyList.appendChild(fragment);
    }

    function handleProxyListClick(event) {
        const button =
            event.target.closest('button');

        if (!button) {
            return;
        }

        if (button.classList.contains('copy-btn')) {
            const text =
                button.getAttribute('data-clipboard');

            if (!text) {
                return;
            }

            showSecurityToast('check');

            checkProxySecurity(text).then(status => {
                showSecurityToast(
                    status,
                    null,
                    true
                );

                if (status === 'reported') {
                    showModal(
                        `<b>ج.ا در کمین است!</b><br>این پروکسی ممکن است توسط سایبری‌های ج.ا تولید شده باشد.`,
                        () =>
                            navigator.clipboard
                                .writeText(text)
                                .then(() =>
                                    showToast('کپی شد!')
                                ),
                        'کپی'
                    );
                } else {
                    setTimeout(() => {
                        navigator.clipboard
                            .writeText(text)
                            .then(() =>
                                showToast('کپی شد!')
                            );
                    }, 800);
                }
            });
        }

        if (button.classList.contains('connect-btn')) {
            const link =
                button.getAttribute('data-link');

            const proxyAddress =
                button.getAttribute(
                    'data-proxy-address'
                );

            if (link && proxyAddress) {
                handleProxyAction(
                    link,
                    proxyAddress
                );
            }
        }

        if (button.classList.contains('report-btn')) {
            const proxy =
                button.getAttribute('data-proxy');

            if (!proxy) {
                return;
            }

            fetch(
                'https://proxy.freedomguard.workers.dev/report',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        proxy
                    })
                }
            )
                .then(res => res.json())
                .then(data => {
                    showToast(
                        data.message ||
                        'گزارش ثبت شد!'
                    );
                })
                .catch(() => {
                    showToast(
                        'خطا در ارسال گزارش!'
                    );
                });
        }
    }

    window.addEventListener(
        'scroll',
        onScroll
    );

    function onScroll() {
        if (
            window.innerHeight +
            window.scrollY >=
            document.body.offsetHeight - 220
        ) {
            renderNextBatch();
        }
    }

    const fetchProxies = debounce(
        async () => {
            document
                .getElementById('loading')
                ?.classList.remove('hidden');

            document
                .getElementById('error')
                ?.classList.add('hidden');

            proxyList.innerHTML = '';

            loadMoreBtn?.classList.add(
                'hidden'
            );

            sourceProxies = new Map();
            sourceModes = new Map();

            proxies = [];
            renderedCount = 0;

            pendingSources =
                mainURLs.length;

            renderToken += 1;

            updateLoadStatus();

            const runId =
                ++fetchRunId;

            await Promise.all(
                mainURLs.map(
                    async url => {
                        if (
                            runId !==
                            fetchRunId
                        ) {
                            return;
                        }

                        const cached =
                            await getCachedSource(
                                url
                            );

                        if (
                            runId !==
                            fetchRunId
                        ) {
                            return;
                        }

                        if (
                            cached &&
                            cached.age <
                            cacheMaxAge
                        ) {
                            const cachedList =
                                parseProxyData(
                                    cached.data,
                                    url
                                ).map(
                                    proxy => ({
                                        ...proxy,
                                        sourceURL:
                                            url,
                                        sourceMode:
                                            'cache'
                                    })
                                );

                            sourceProxies.set(
                                url,
                                cachedList
                            );

                            sourceModes.set(
                                url,
                                'cache'
                            );

                            rebuildProxiesFromSources(url.split("#")[1]);
                        }

                        try {
                            const data =
                                await fetchSource(
                                    url
                                );

                            if (
                                runId !==
                                fetchRunId
                            ) {
                                return;
                            }

                            const onlineList =
                                parseProxyData(
                                    data,
                                    url
                                ).map(
                                    proxy => ({
                                        ...proxy,
                                        sourceURL:
                                            url,
                                        sourceMode:
                                            'online'
                                    })
                                );

                            sourceProxies.set(
                                url,
                                onlineList
                            );

                            sourceModes.set(
                                url,
                                'online'
                            );

                            rebuildProxiesFromSources(url.split("#")[1]);
                        } catch (error) {
                            if (
                                runId !==
                                fetchRunId
                            ) {
                                return;
                            }

                            if (
                                !cached
                            ) {
                                sourceModes.delete(
                                    url
                                );
                            }

                            if (
                                cached &&
                                cached.data
                            ) {
                                const cachedList =
                                    parseProxyData(
                                        cached.data,
                                        url
                                    ).map(
                                        proxy => ({
                                            ...proxy,
                                            sourceURL:
                                                url,
                                            sourceMode:
                                                'cache'
                                        })
                                    );

                                sourceProxies.set(
                                    url,
                                    cachedList
                                );

                                sourceModes.set(
                                    url,
                                    'cache'
                                );

                                rebuildProxiesFromSources(url.split("#")[1]);
                            }
                        } finally {
                            if (
                                runId ===
                                fetchRunId
                            ) {
                                pendingSources -=
                                    1;

                                updateLoadStatus();

                                if (
                                    pendingSources ===
                                    0
                                ) {
                                    document
                                        .getElementById(
                                            'loading'
                                        )
                                        ?.classList.add(
                                            'hidden'
                                        );

                                    if (
                                        proxies.length ===
                                        0
                                    ) {
                                        const err =
                                            document.getElementById(
                                                'error'
                                            );

                                        err.textContent =
                                            'خطا در دریافت پروکسی‌ها!';

                                        err.classList.remove(
                                            'hidden'
                                        );
                                    }
                                }
                            }
                        }
                    }
                )
            );
        },
        300
    );

    document
        .getElementById('fetch-proxies')
        ?.addEventListener(
            'click',
            fetchProxies
        );

    document
        .getElementById('random-proxy')
        ?.addEventListener(
            'click',
            () => {
                if (
                    proxies.length === 0
                ) {
                    const err =
                        document.getElementById(
                            'error'
                        );

                    err.textContent =
                        'ابتدا پروکسی‌ها را دریافت کنید!';

                    err.classList.remove(
                        'hidden'
                    );

                    return;
                }

                proxies.length == 1
                    ? proxies =
                    backUpProxies
                    : backUpProxies =
                    proxies;

                const randomProxy = [
                    proxies[
                    Math.floor(
                        Math.random() *
                        proxies.length
                    )
                    ]
                ];

                displayProxies(
                    randomProxy
                );
            }
        );
});

async function checkProxySecurity(proxy) {
    const result =
        await Promise.race([
            fetch(
                'https://proxy.freedomguard.workers.dev/report-check',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        proxy
                    })
                }
            )
                .then(res =>
                    res.json()
                )
                .catch(() => ({
                    status: 'safe'
                })),

            new Promise(resolve =>
                setTimeout(
                    () =>
                        resolve({
                            status: 'safe'
                        }),
                    5000
                )
            )
        ]);

    return result.status;
}

function showSecurityToast(
    type,
    link = null,
    hideAfterDelay = true
) {
    const securityCheck =
        document.getElementById(
            'security-check'
        );

    if (!securityCheck) {
        return;
    }

    if (type === 'check') {
        securityCheck.textContent =
            'در حال بررسی پروکسی ...';
    } else if (type === 'safe') {
        securityCheck.textContent =
            '✅ پروکسی امن است.';
    } else if (type === 'reported') {
        securityCheck.textContent =
            '❌ پروکسی گزارش‌شده است.';
    } else if (type === 'unsafe') {
        securityCheck.textContent =
            '⚠️ پروکسی ممکن است ناامن باشد.';
    } else if (type === 'not_connect') {
        securityCheck.textContent =
            '⚠️ این پروکسی ممکن است وصل نشود.';
    }

    securityCheck.classList.remove(
        'hidden'
    );

    if (hideAfterDelay) {
        setTimeout(() => {
            securityCheck.classList.add(
                'hidden'
            );
        }, 1500);
    }
}

async function handleProxyAction(
    link,
    proxy
) {
    showSecurityToast('check');

    const status =
        await checkProxySecurity(
            proxy
        );

    showSecurityToast(status);

    if (status === 'reported') {
        showModal(
            `<b>ج.ا در کمین است!</b><br>این پروکسی ممکن است توسط سایبری‌های ج.ا تولید شده باشد و ابزار پروپاگاندای حکومتی باشد.`,
            () =>
                window.open(
                    link,
                    '_blank'
                ),
            'اتصال'
        );
    } else if (
        status === 'unsafe'
    ) {
        showModal(
            'این پروکسی ممکن است ناامن باشد.',
            () =>
                window.open(
                    link,
                    '_blank'
                ),
            'اتصال با ریسک'
        );
    } else if (
        status === 'not_connect'
    ) {
        showModal(
            '⚠️ این پروکسی ممکن است وصل نشود یا از کار افتاده باشد.',
            () =>
                window.open(
                    link,
                    '_blank'
                ),
            'امتحان اتصال'
        );
    } else {
        link = link.replace(
            'https://t.me/',
            'tg://'
        );

        window.open(
            link,
            '_blank'
        );
    }
}

function showModal(
    message,
    onConfirm,
    confirmText = 'ادامه'
) {
    const modal =
        document.getElementById(
            'security-modal'
        );

    const msgBox =
        document.getElementById(
            'security-modal-message'
        );

    const confirmBtn =
        document.getElementById(
            'modal-confirm'
        );

    const cancelBtn =
        document.getElementById(
            'modal-cancel'
        );

    if (
        !modal ||
        !msgBox ||
        !confirmBtn ||
        !cancelBtn
    ) {
        onConfirm?.();
        return;
    }

    msgBox.innerHTML = message;
    confirmBtn.textContent =
        confirmText;

    modal.classList.remove(
        'hidden'
    );

    const close = () => {
        modal.classList.add(
            'hidden'
        );

        confirmBtn.removeEventListener(
            'click',
            handler
        );

        cancelBtn.removeEventListener(
            'click',
            close
        );
    };

    const handler = () => {
        close();
        onConfirm?.();
    };

    confirmBtn.addEventListener(
        'click',
        handler
    );

    cancelBtn.addEventListener(
        'click',
        close
    );
}