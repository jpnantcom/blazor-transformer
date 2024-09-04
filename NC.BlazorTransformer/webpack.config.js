import CopyWebpackPlugin from 'copy-webpack-plugin';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    entry: './wwwroot/phi3/phi3-submitprompt.js',
    output: {
        filename: 'phi3-submitprompt.bundle.js',
        path: path.resolve(__dirname, './wwwroot/phi3'),
        library: 'Phi3Host',
        libraryTarget: 'var',
    },
    plugins: [
        // Copy .wasm files to dist folder
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/onnxruntime-web/dist/*.jsep.*',
                    to: '[name][ext]'
                },
            ],
        }),
    ],
    mode: 'development',
    devtool: 'source-map',
};