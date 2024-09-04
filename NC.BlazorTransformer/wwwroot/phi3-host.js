export function initPhi3()
{
    return new Promise((resolve, reject) => {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "./_content/NC.BlazorTransformer/phi3/phi3-submitprompt.bundle.js";
        script.onload = function () {
            resolve();
        };
        script.onerror = function () {
            reject(new Error("Failed to load script"));
        };
        document.head.appendChild(script);
    });
}

export function submitPrompt(prompt, options, dotNetReference)
{
    return Phi3Host.submitPrompt(prompt, options, dotNetReference);
}