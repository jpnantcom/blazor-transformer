let instance = {};

export function embed(text) {

    if (instance.embed == null) {

        instance.promises = [];
        instance.requestIndex = 0;

        instance.worker = new Worker('./_content/NC.BlazorTransformer/workers/nomic-embed-worker.js', { type: 'module' });

        instance.worker.onmessage = function (e) {

            const { index, result, error } = e.data;
            const { resolve, reject } = instance.promises[index];

            if (error) {
                reject(error);
                console.log('NomicEmbed: Worker Response Received (Error)');

            } else {
                resolve(result);
                console.log('NomicEmbed: Worker Response Received (Done)');
                console.log(result);
            }
            delete instance.promises[index];
        };

        instance.worker.onerror = function (e) {
            console.error('NomicEmbed: Worker error:', e.message);
        };

        instance.embed = function (text) {
            new Promise((resolve, reject) => {
                const index = instance.requestIndex++;
                instance.promises[index] = { resolve, reject };
                instance.worker.postMessage({
                    index: index,
                    data: {
                        input: [text]
                    }
                });

                console.log(`NomicEmbed: Posted Message ${index}`);
            });
        };

    }

    return instance.embed(text);
};