export { loadModel, getModel, clearModel } from "./loaders/onnxLoader";
export { transcribeAudio } from "./inference/whisperInference";
export { classifyGesture } from "./inference/gestureInference";
export type { GestureResult } from "./inference/gestureInference";
