import { pipeline, layer_norm } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

let extractor = null;

self.onmessage = async function (e) {

    const { index, data } = e.data;

    console.log(`NomicEmbed Worker: Received Message ${index}`)

    if (!Array.isArray(data.input) || data.input.length != 1) {

        self.postMessage({
            error: "Require exactly one text in input attribute, such as: { input: ['text to embed' ] }"
        });

        return;
    }

    const start = performance.now();

    if (extractor == null) {
        extractor = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1.5', {
            quantized: true,
        });
    }

    const loadTime = performance.now();

    let embeddings = await extractor(data.input, { pooling: 'mean' });

    const embedTime = performance.now();

    const matryoshka_dim = 256;
    embeddings = layer_norm(embeddings, [embeddings.dims[1]])
        .slice(null, [0, matryoshka_dim])
        .normalize(1, -1);

    let embeddingsArray = embeddings.tolist();

    self.postMessage(
        {
            index : index,
            result: {
                model: "nomic-embed-text:v1.5",
                embeddings: embeddingsArray,
                total_duration: embedTime - start,
                load_duration: loadTime - start
            }
        }
    );

    console.log('NomicEmbed: Worker Response for Message:', index);
};