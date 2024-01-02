import { action } from "./actions.js";

class StarCoder {
    // callback have to be defined before load_worker
    constructor(
        url,
        init_callback,
        write_result_callback,
        on_complete_callback,
    ) {
        this.url = url;
        this.init_callback = init_callback;   // called back when model is loaded
        this.write_result_callback = write_result_callback; // Expectes text parameter and will be called when model generates result.
        this.on_complete_callback = on_complete_callback;
    }

    load_worker() {
        this.worker = new Worker(
            new URL('./worker.js', import.meta.url)
            , { type: 'module' }
        );


        this.worker.onmessage = (event) => {
            switch (event.data.event) {
                // Load Model
                case action.INITIALIZED: {
                    if (this.init_callback) this.init_callback();
                    break;
                }

                // Capture result
                case action.WRITE_RESULT: {
                    if (this.write_result_callback) this.write_result_callback(event.data.line);
                    break;
                }

                // Execution Completed
                case action.RUN_COMPLETED: {
                    if (this.on_complete_callback) this.on_complete_callback();
                    break;
                }
            }
        };

        this.worker.postMessage({
            event: action.LOAD,
            url: this.url,
        });
    }

    run({
        prompt,
        seed = -1,
        max_token_len = 50,
        top_k = 40,
        top_p = 0.9,
        temp = 1.0,
        repeat_last_n = 64,
        repeat_penalty = 1.176
    } = {}) {
        this.worker.postMessage({
            event: action.RUN_MAIN,
            prompt,
            seed,
            max_token_len,
            top_k,
            top_p,
            temp,
            repeat_last_n,
            repeat_penalty
        });
    }
}

let submitButton = document.getElementById('submitBtn');
let outputElement = document.getElementById('output');

const on_loaded = () => {
    submitButton.disabled = false;
    submitButton.innerText = "Generate";
}

const write_result = (line) => {
    outputElement.textContent += line + "\n";
}

const run_model = () => {
    const text = document.getElementById("textInput").value;
    submitButton.innerText = "Running...";
    submitButton.disabled = true;
    outputElement.textContent = ""; // clead old content
    app.run({
        prompt: text,
        top_k: 1
    });
}

const run_complete = () => {
    submitButton.innerText = "Generate";
    submitButton.disabled = false;
}

// '../models/tiny_starcoder_py-ggml-q8_0.bin',

const app = new StarCoder(
    'https://huggingface.co/rahuldshetty/tiny_starcoder_py_ggml/resolve/main/tiny_starcoder_py-ggml-q4_0.bin',
    on_loaded,
    write_result,
    run_complete
);

app.load_worker();
submitButton.addEventListener("click", run_model);