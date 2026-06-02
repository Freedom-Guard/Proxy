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
    const mainURL = 'https://raw.githubusercontent.com/MahsaNetConfigTopic/proxy/main/proxies.txt';
    const backupURL = 'https://req.freedomguard.workers.dev/' + (mainURL);
    const batchSize = 100;
    let proxies = [];
    let renderedCount = 0;

    const loadStatus = document.getElementById('load-status');
    const loadMoreBtn = document.getElementById('load-more');
    const proxyList = document.getElementById('proxy-list');
    const errorBox = document.getElementById('error');

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    document.getElementById('theme-toggle').addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });

    proxyList.addEventListener('click', handleProxyListClick);
    loadMoreBtn.addEventListener('click', renderNextBatch);

    function debounce(func, wait) {
        let timeout;
        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    function displayProxies(listData) {
        if (listData.length === 0) {
            errorBox.textContent = 'پروکسی یافت نشد!';
            errorBox.classList.remove('hidden');
            proxyList.innerHTML = '';
            loadStatus.textContent = '';
            loadMoreBtn.classList.add('hidden');
            return;
        }

        errorBox.classList.add('hidden');
        proxies = listData;
        renderedCount = 0;
        proxyList.innerHTML = '';
        renderNextBatch();
    }

    function renderNextBatch() {
        if (renderedCount >= proxies.length) return;
        const nextChunk = proxies.slice(renderedCount, renderedCount + batchSize);
        appendProxies(nextChunk);
        renderedCount += nextChunk.length;
        updateLoadStatus();
        if (renderedCount >= proxies.length) {
            loadMoreBtn.classList.add('hidden');
        } else {
            loadMoreBtn.classList.remove('hidden');
        }
    }

    function appendProxies(items) {
        const fragment = document.createDocumentFragment();
        items.forEach(proxy => {
            const card = document.createElement('div');
            card.className = 'proxy-card bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1';
            card.innerHTML = `
            <div class="flex justify-between items-start gap-3 mb-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-gray-100">${proxy.name}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1" dir="ltr">${proxy.link}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${proxy.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}">
                    ${proxy.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
            </div>
            <div class="flex flex-wrap gap-2">
                <button class="copy-btn bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" data-clipboard="${proxy.address}:${proxy.port}">کپی</button>
                <button class="connect-btn bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition" data-link="${proxy.link}" data-proxy-address="${proxy.address}:${proxy.port}">اتصال</button>
                <button class="report-btn bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition" data-proxy="${proxy.address}:${proxy.port}">گزارش</button>
            </div>
            `;
            fragment.appendChild(card);
        });
        proxyList.appendChild(fragment);
    }

    function updateLoadStatus() {
        if (proxies.length === 0) {
            loadStatus.textContent = '';
            return;
        }
        loadStatus.textContent = `نمایش ${Math.min(renderedCount, proxies.length)} از ${proxies.length} پروکسی`;
    }

    function handleProxyListClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.classList.contains('copy-btn')) {
            const text = button.getAttribute('data-clipboard');
            if (!text) return;
            showSecurityToast('check');
            checkProxySecurity(text).then(status => {
                showSecurityToast(status, null, true);
                if (status === 'reported') {
                    showModal(
                        `<b>ج.ا در کمین است!</b><br>این پروکسی ممکن است توسط سایبری‌های ج.ا تولید شده باشد.`,
                        () => navigator.clipboard.writeText(text).then(() => showToast('کپی شد!')),
                        'کپی'
                    );
                } else {
                    setTimeout(() => navigator.clipboard.writeText(text).then(() => showToast('کپی شد!')), 800);
                }
            });
        }

        if (button.classList.contains('connect-btn')) {
            const link = button.getAttribute('data-link');
            const proxyAddress = button.getAttribute('data-proxy-address');
            if (link && proxyAddress) handleProxyAction(link, proxyAddress);
        }

        if (button.classList.contains('report-btn')) {
            const proxy = button.getAttribute('data-proxy');
            if (!proxy) return;
            fetch('https://proxy.freedomguard.workers.dev/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxy })
            }).then(res => res.json()).then(data => showToast(data.message || 'گزارش ثبت شد!')).catch(() => showToast('خطا در ارسال گزارش!'));
        }
    }

    window.addEventListener('scroll', onScroll);

    function onScroll() {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 220) {
            renderNextBatch();
        }
    }

    async function fetchFallback(main, backup) {
        try {
            const res = await fetch(main);
            if (!res.ok) throw new Error();
            return await res.text();
        } catch {
            const res = await fetch(backup);
            if (!res.ok) throw new Error();
            return await res.text();
        }
    }

    const fetchProxies = debounce(() => {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('proxy-list').innerHTML = '';

        fetchFallback(mainURL, backupURL)
            .then(data => {
                document.getElementById('loading').classList.add('hidden');
                proxies = data
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map((line, index) => {
                        const [address, port] = line.split(':');
                        return {
                            address,
                            port,
                            status: 'active',
                            name: `پروکسی ${index + 1}`,
                            link: line
                        };
                    });

                displayProxies(proxies);
            })
            .catch(() => {
                document.getElementById('loading').classList.add('hidden');
                const err = document.getElementById('error');
                err.textContent = 'خطا در دریافت پروکسی‌ها!';
                err.classList.remove('hidden');
            });
    }, 300);

    document.getElementById('fetch-proxies').addEventListener('click', fetchProxies);

    document.getElementById('random-proxy').addEventListener('click', () => {
        if (proxies.length === 0) {
            const err = document.getElementById('error');
            err.textContent = 'ابتدا پروکسی‌ها را دریافت کنید!';
            err.classList.remove('hidden');
            return;
        }
        const randomProxy = [proxies[Math.floor(Math.random() * proxies.length)]];
        displayProxies(randomProxy);
    });
});

async function checkProxySecurity(proxy) {
    const result = await Promise.race([
        fetch('https://proxy.freedomguard.workers.dev/report-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proxy })
        }).then(res => res.json()).catch(() => ({ status: 'safe' })),
        new Promise(resolve => setTimeout(() => resolve({ status: 'safe' }), 5000))
    ]);

    return result.status;
}

function showSecurityToast(type, link = null, hideAfterDelay = true) {
    const securityCheck = document.getElementById('security-check');

    if (type === 'check') {
        securityCheck.textContent = 'در حال بررسی پروکسی ...';
    } else if (type === 'safe') {
        securityCheck.textContent = '✅ پروکسی امن است.';
    } else if (type === 'reported') {
        securityCheck.textContent = '❌ پروکسی گزارش‌شده است.';
    } else if (type === 'unsafe') {
        securityCheck.textContent = '⚠️ پروکسی ممکن است ناامن باشد.';
    } else if (type === 'not_connect') {
        securityCheck.textContent = '⚠️ این پروکسی ممکن است وصل نشود.';
    }

    securityCheck.classList.remove('hidden');

    if (hideAfterDelay) {
        setTimeout(() => {
            securityCheck.classList.add('hidden');
        }, 1500);
    }
}

async function handleProxyAction(link, proxy) {
    showSecurityToast('check');

    const status = await checkProxySecurity(proxy);

    showSecurityToast(status);

    if (status === 'reported') {
        showModal(
            ` <b>ج.ا در کمین است!</b><br>این پروکسی ممکن است توسط سایبری‌های ج.ا تولید شده باشد و ابزار پروپاگاندای حکومتی باشد.`,
            () => window.open(link, '_blank'),
            'اتصال '
        );
    } else if (status === 'unsafe') {
        showModal(
            'این پروکسی ممکن است ناامن باشد.',
            () => window.open(link, '_blank'),
            'اتصال با ریسک'
        );
    } else if (status === 'not_connect') {
        showModal(
            '⚠️ این پروکسی ممکن است وصل نشود یا از کار افتاده باشد.',
            () => window.open(link, '_blank'),
            'امتحان اتصال'
        );
    } else {
        window.open(link, '_blank');
    }
}

function showModal(message, onConfirm, confirmText = 'ادامه') {
    const modal = document.getElementById('security-modal');
    const msgBox = document.getElementById('security-modal-message');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    msgBox.innerHTML = message;
    confirmBtn.textContent = confirmText;
    modal.classList.remove('hidden');

    const close = () => {
        modal.classList.add('hidden');
        confirmBtn.removeEventListener('click', handler);
        cancelBtn.removeEventListener('click', close);
    };

    const handler = () => {
        close();
        onConfirm?.();
    };

    confirmBtn.addEventListener('click', handler);
    cancelBtn.addEventListener('click', close);
}