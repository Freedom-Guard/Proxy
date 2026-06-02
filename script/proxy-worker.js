self.addEventListener('message', async event => {
    if (event.data.action !== 'fetch') return
    const [mainURL, backupURL] = event.data.urls
    try {
        const text = await fetchText(mainURL, backupURL)
        const lines = text.split('\n').filter(line => line.trim())
        const proxies = lines.map((line, index) => {
            const [address, port] = line.split(':')
            return {
                address,
                port,
                status: 'active',
                name: `پروکسی ${index + 1}`,
                link: line
            }
        })
        const total = proxies.length
        for (let i = 0; i < total; i += 100) {
            const slice = proxies.slice(i, i + 100)
            postMessage({ action: 'batch', proxies: slice, total, loaded: Math.min(i + 100, total) })
        }
        postMessage({ action: 'done', total })
    } catch {
        postMessage({ action: 'error' })
    }
})

async function fetchText(mainURL, backupURL) {
    const response = await fetch(mainURL)
    if (response.ok) return await response.text()
    const backupResponse = await fetch(backupURL)
    if (backupResponse.ok) return await backupResponse.text()
    throw new Error('fetch failed')
}
