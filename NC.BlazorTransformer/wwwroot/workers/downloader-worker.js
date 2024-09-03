self.onmessage = async function (event) {
    const { url, cacheName } = event.data;
    try {
        await downloadAndCache(url, cacheName);
        self.postMessage({ status: 'complete' });
    } catch (error) {
        self.postMessage({ status: 'error', message: error.message });
    }
};

async function downloadAndCache(url, cacheName)
{
    const response = await fetch(url);
    if (!response.ok)
    {
        throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength)
    {
        throw new Error('Content-Length response header is missing');
    }

    const isCached = await checkCache(url, cacheName, contentLength);
    if (isCached)
    {
        self.postMessage({ status: 'progress', loaded: contentLength, total: contentLength });
        return;
    }

    let loaded = 0;
    const reader = response.body.getReader();
    const chunks = [];

    const total = parseInt(contentLength, 10);

    while (true)
    {
        const { done, value } = await reader.read();

        if (done)
        {
            break;
        }

        chunks.push(value);
        loaded += value.length;

        self.postMessage({ status: 'progress', loaded, total });
    }

    const blob = new Blob(chunks);
    const responseClone = new Response(blob,
        {
            headers:
            {
                'Content-Type': 'application/octet-stream',
                'Content-Length': blob.size.toString()
            }
        }
    );

    const cache = await caches.open(cacheName);
    await cache.put(url, responseClone);
}

async function checkCache(url, cacheName, remoteContentLength) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(url);

    if (cachedResponse)
    {
        const contentLength = cachedResponse.headers.get('content-length');

        if (contentLength)
        {
            const total = parseInt(contentLength, 10);

            if (remoteContentLength &&
                parseInt(contentLength, 10) === parseInt(remoteContentLength, 10))
            {
                return true;
            }
        }
    }
    return false;
}