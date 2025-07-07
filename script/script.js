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
}
$(document).ready(function () {
    const url = 'https://raw.githubusercontent.com/MahsaNetConfigTopic/proxy/main/proxies.txt';
    let proxies = [];
    let isDarkMode = localStorage.getItem('theme') === 'dark';

    if (isDarkMode) {
        $('body').addClass('dark');
    }

    if (localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    document.getElementById('theme-toggle').addEventListener('click', function () {
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
        $('#proxy-list').empty();
        proxyList.forEach((proxy, index) => {
            const card = `
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold">${proxy.name}</h3>
                                <span class="text-sm ${proxy.status === 'active' ? 'text-green-500' : 'text-red-500'}">
                                    ${proxy.status === 'active' ? 'فعال' : 'غیرفعال'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-2" dir="ltr">${proxy.link}</p>
                            <div class="flex gap-2">
                                <button class="copy-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition" data-clipboard="${proxy.address}:${proxy.port}">
                                    کپی
                                </button>
                                <button class="connect-btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition" data-link="${proxy.link}">
                                    اتصال
                                </button>
                            </div>
                        </div>`;
            $('#proxy-list').append(card);
        });

        $('.copy-btn').off('click').on('click', function () {
            const text = $(this).data('clipboard');
            navigator.clipboard.writeText(text).then(() => {
                $('#toast').text('کپی شد!').removeClass('hidden');
                setTimeout(() => $('#toast').addClass('hidden'), 2000);
            });
        });

        $('.connect-btn').off('click').on('click', function () {
            const link = $(this).data('link');
            if (link) window.open(link, '_blank');
        });

    }

    const fetchProxies = debounce(function () {
        $('#loading').removeClass('hidden');
        $('#error').addClass('hidden');
        $('#proxy-list').empty();

        $.ajax({
            url: url,
            method: 'GET',
            cache: false,
            success: function (data) {
                $('#loading').addClass('hidden');
                proxies = data.split('\n').filter(line => line.trim() !== '').map((line, index) => {
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
                    $('#error').text('پروکسی یافت نشد!').removeClass('hidden');
                    return;
                }

                displayProxies(proxies);
            },
            error: function () {
                $('#loading').addClass('hidden');
                $('#error').text('خطا در دریافت پروکسی‌ها!').removeClass('hidden');
            }
        });
    }, 300);

    $('#fetch-proxies').click(fetchProxies);

    $('#random-proxy').click(function () {
        if (proxies.length === 0) {
            $('#error').text('ابتدا پروکسی‌ها را دریافت کنید!').removeClass('hidden');
            return;
        }
        const randomProxy = [proxies[Math.floor(Math.random() * proxies.length)]];
        displayProxies(randomProxy);
    });
});