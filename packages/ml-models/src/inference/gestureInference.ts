import * as ort from "onnxruntime-web";
import { loadModel } from "../loaders/onnxLoader";

const MODEL_URL = "/models/isl-gesture-v1.onnx";
const MODEL_NAME = "isl-gesture";

export interface GestureResult {
  label: string;
  confidence: number;
}

export const classifyGesture = async (landmarks: Float32Array): Promise<GestureResult> => {
  const session = await loadModel(MODEL_NAME, MODEL_URL);

  const inputTensor = new ort.Tensor("float32", landmarks, [1, landmarks.length]);

  const results = await session.run({ input: inputTensor });
  const output = results["output"] || results[Object.keys(results)[0]];

  const scores = Array.from(output.data as Float32Array);
  const maxIndex = scores.indexOf(Math.max(...scores));

  return {
    label: `gesture_${maxIndex}`,
    confidence: scores[maxIndex],
  };
};
