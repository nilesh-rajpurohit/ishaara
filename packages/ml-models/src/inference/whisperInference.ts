import * as ort from "onnxruntime-web";
import { loadModel } from "../loaders/onnxLoader";

const MODEL_URL = "/models/whisper-tiny-multilingual.onnx";
const MODEL_NAME = "whisper-tiny";

export const transcribeAudio = async (audioData: Float32Array): Promise<string> => {
  const session = await loadModel(MODEL_NAME, MODEL_URL);

  const inputTensor = new ort.Tensor("float32", audioData, [1, audioData.length]);

  const feeds: Record<string, ort.Tensor> = {
    input_features: inputTensor,
  };

  const results = await session.run(feeds);
  const output = results["output"] || results[Object.keys(results)[0]];

  return output.data.toString();
};
