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

    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (isDarkMode) document.body.classList.add('dark');

    if (
        localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
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
          <button class="connect-btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition" data-link="${proxy.link}">اتصال</button>
        </div>
      `;
            list.appendChild(card);
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-clipboard');
                navigator.clipboard.writeText(text).then(() => {
                    const toast = document.getElementById('toast');
                    toast.textContent = 'کپی شد!';
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 2000);
                });
            });
        });

        document.querySelectorAll('.connect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const link = btn.getAttribute('data-link');
                if (link) window.open(link, '_blank');
            });
        });
    }

    const fetchProxies = debounce(() => {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('proxy-list').innerHTML = '';

        fetch(url)
            .then(response => response.text())
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

                if (proxies.length === 0) {
                    const err = document.getElementById('error');
                    err.textContent = 'پروکسی یافت نشد!';
                    err.classList.remove('hidden');
                    return;
                }

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
