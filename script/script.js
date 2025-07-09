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
    const url = 'https://raw.githubusercontent.com/MahsaNetConfigTopic/proxy/main/proxies.txt';
    let proxies = [];

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

    function debounce(func, wait) {
        let timeout;
        return function () {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    function displayProxies(proxyList) {
        const list = document.getElementById('proxy-list');
        list.innerHTML = '';

        if (proxyList.length === 0) {
            const err = document.getElementById('error');
            err.textContent = 'پروکسی یافت نشد!';
            err.classList.remove('hidden');
            return;
        } else {
            document.getElementById('error').classList.add('hidden');
        }

        proxyList.forEach((proxy, index) => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition transform hover:-translate-y-1';

            card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">${proxy.name}</h3>
                <span class="text-sm ${proxy.status === 'active' ? 'text-green-500' : 'text-red-500'}">
                ${proxy.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2" dir="ltr">${proxy.link}</p>
            <div class="flex gap-2">
                <button class="copy-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition" data-clipboard="${proxy.address}:${proxy.port}">کپی</button>
                <button class="connect-btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition" data-link="${proxy.link}" data-proxy-address="${proxy.address}:${proxy.port}">اتصال</button>
                <button class="report-btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition" data-proxy="${proxy.address}:${proxy.port}">گزارش</button>
            </div>
            `;
            list.appendChild(card);
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const text = btn.getAttribute('data-clipboard');
                const proxy = text;

                showSecurityToast('check');
                const status = await checkProxySecurity(proxy);
                showSecurityToast(status, null, true);
                if (status == "reported") {
                    showModal(
                        ` <b>ج.ا در کمین است!</b><br>این پروکسی ممکن است توسط سایبری‌های ج.ا تولید شده باشد و ابزار پروپاگاندای حکومتی باشد.`,
                        () => {
                            navigator.clipboard.writeText(text).then(() => {
                                const toast = document.getElementById('toast');
                                toast.textContent = 'کپی شد!';
                                toast.classList.remove('hidden');
                                setTimeout(() => toast.classList.add('hidden'), 2000);
                            }).catch(err => {
                                console.error('Failed to copy: ', err);
                                const toast = document.getElementById('toast');
                                toast.textContent = 'خطا در کپی!';
                                toast.classList.remove('hidden');
                                setTimeout(() => toast.classList.add('hidden'), 2000);
                            });
                        },
                        'کپی '
                    );
                } else {
                    setTimeout(() => {
                        navigator.clipboard.writeText(text).then(() => {
                            const toast = document.getElementById('toast');
                            toast.textContent = 'کپی شد!';
                            toast.classList.remove('hidden');
                            setTimeout(() => toast.classList.add('hidden'), 2000);
                        }).catch(err => {
                            console.error('Failed to copy: ', err);
                            const toast = document.getElementById('toast');
                            toast.textContent = 'خطا در کپی!';
                            toast.classList.remove('hidden');
                            setTimeout(() => toast.classList.add('hidden'), 2000);
                        });
                    }, 800);
                }

            });
        });

        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const link = btn.getAttribute('data-link');
                const proxyAddress = btn.getAttribute('data-proxy-address');
                await handleProxyAction(link, proxyAddress);
            });
        });

        document.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const proxy = btn.getAttribute('data-proxy');

                try {
                    const res = await fetch('https://proxy.freedomguard.workers.dev/report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ proxy }),
                    });
                    const data = await res.json();

                    const toast = document.getElementById('toast');
                    toast.textContent = data.message || 'گزارش ثبت شد!';
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 3000);
                } catch (error) {
                    console.error('Error reporting proxy:', error);
                    const toast = document.getElementById('toast');
                    toast.textContent = 'خطا در ارسال گزارش!';
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 3000);
                }
            });
        });
    }

    const fetchProxies = debounce(() => {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('proxy-list').innerHTML = '';

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
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
            .catch(error => {
                console.error('Error fetching proxies:', error);
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