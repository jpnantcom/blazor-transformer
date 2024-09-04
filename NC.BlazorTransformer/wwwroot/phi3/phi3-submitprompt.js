import { env, AutoTokenizer } from '@xenova/transformers';
import { LLM } from './llm.js';

//based on: https://github.com/microsoft/onnxruntime-inference-examples/blob/main/js/chat/main.js

//
// Check if we have webgpu and fp16
//
async function hasWebGPU()
{
    // returns 0 for webgpu with f16, 1 for webgpu without f16, 2 for no webgpu
    if (!("gpu" in navigator))
    {
        return null;
    }
    try
    {
        const adapter = await navigator.gpu.requestAdapter()
        if (adapter.features.has('shader-f16'))
        {
            return true;
        }

        return false;

    } catch (e)
    {
        return null;
    }
}

let instance = null;

export async function submitPrompt(prompt, options, dotNetReference)
{
    if (instance == null)
    {
        instance = {
            supported: false,
            dotNetReference: dotNetReference,
        };

        instance.log = (message) =>
        {
            console.log(message);
            instance.dotNetReference.invokeMethodAsync('Log', message);
        };

        instance.error = (message) =>
        {
            console.error(message);
            instance.dotNetReference.invokeMethodAsync('Error', message);
        };

        instance.callback = (text) =>
        {
            instance.dotNetReference.invokeMethodAsync('StreamToken', text);
        };

        instance.hasFP16 = await hasWebGPU();

        if (instance.hasFP16 == null)
        {
            instance.dotNetReference.invokeMethodAsync("Error", "No WebGPU support");
            throw new Error("No WebGPU support");
        }

        instance.supported = true;

        if (instance.hasFP16 === true)
        {
            instance.log("WebGPU with f16 support");
        }
        else
        {
            instance.log("WebGPU without f16 support");
        }

        // setup for transformers.js tokenizer
        env.localModelPath = 'models';
        env.allowRemoteModels = true;
        env.allowLocalModels = true;

        instance.llm = new LLM(instance.log);
        instance.config = {
            model: { name: "phi3", path: "microsoft/Phi-3-mini-4k-instruct-onnx-web", externaldata: true },
            provider: "webgpu",
            profiler: 0,
            verbose: 0,
            threads: 1,
            show_special: 1,
            csv: 0,
            max_tokens: 4096,
            local: 0,
        };

        try
        {
            instance.log("Loading model...");
            instance.tokenizer = await AutoTokenizer.from_pretrained(instance.config.model.path);

            await instance.llm.load(instance.config.model, {
                provider: instance.config.provider,
                profiler: instance.config.profiler,
                verbose: instance.config.verbose,
                local: instance.config.local,
                max_tokens: instance.config.max_tokens,
                hasFP16: instance.hasFP16,
            });

            instance.log("Ready.");
            instance.ready = true;

        } catch (error)
        {
            instance.error(error);
            throw new Error(error);
        }

    }

    instance.dotNetReference = dotNetReference;

    if (instance.supported == false)
    {
        instance.error("Platform is not supported");
        throw new Error("Platform is not supported");
    }

    const start_timer = performance.now();
    let time_to_first_token = 0;
    let time_to_load = 0;
    let time_to_prompt = 0;

    let outputs = [];
    let token_to_text = (tokens, startidx) =>
    {
        const txt = instance.tokenizer.decode(tokens.slice(startidx), { skip_special_tokens: instance.config.show_special != 1, });
        outputs.push(txt);
        return txt;
    };

    const { input_ids } = await instance.tokenizer(prompt, { return_tensor: false, padding: true, truncation: true });

    // clear caches
    // TODO: use kv_cache for continuation
    instance.llm.initilize_feed();
    time_to_load = performance.now();

    const output_index = instance.llm.output_tokens.length + input_ids.length;
    const output_tokens = await instance.llm.generate(input_ids, (output_tokens) =>
    {
        if (output_tokens.length == input_ids.length + 1)
        {
            time_to_first_token = performance.now();
        }

        instance.callback(token_to_text(output_tokens, instance.llm.output_tokens.length - 1));

    }, { max_tokens: options.num_predict });

    time_to_prompt = performance.now();
    instance.callback(token_to_text(output_tokens, output_index));

    const seqlen = output_tokens.length - output_index;

    // Ollama compatbile format
    return {
        prompt_eval_count: output_tokens.length - output_index,
        prompt_eval_duration: Math.floor(time_to_first_token - start_timer),
        eval_count: output_tokens.length,
        eval_duration: Math.floor(time_to_prompt - time_to_first_token),
        load_duration: Math.floor(time_to_load - start_timer),
        total_duration: Math.floor(time_to_prompt - start_timer),
        done: true,
        created_at: new Date().toISOString(),
        model: "phi3-mini-4k",
        message: {
            role: "assistant",
            content: outputs.join("")
        }
    };
}