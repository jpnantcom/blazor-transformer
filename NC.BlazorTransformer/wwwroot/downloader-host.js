export function download(url, cacheName, dotNetReference)
{
    return new Promise((resolve, reject) =>
    {
        const worker = new Worker('./_content/NC.BlazorTransformer/workers/downloader-worker.js', { type: 'module' });

        worker.onmessage = function (e)
        {
            const { status, loaded, total, message } = e.data;

            if (status === 'progress')
            {
                dotNetReference.invokeMethodAsync('Progress', 'Downloading', parseInt(loaded), parseInt(total));
            }
            else if (status === 'error')
            {
                dotNetReference.invokeMethodAsync('Error', message);
            }
            else if (status === 'complete')
            {
                dotNetReference.invokeMethodAsync('Complete');

                worker.terminate();
                resolve();

            }
        };

        worker.onerror = function (e)
        {
            console.error('Downloader: Worker error:', e.message);
            dotNetReference.invokeMethodAsync('Error', e.message);

            worker.terminate();
            reject(e);
        };

        worker.postMessage({ url, cacheName });
    });
}