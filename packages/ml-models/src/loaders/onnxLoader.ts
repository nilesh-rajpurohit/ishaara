import * as ort from "onnxruntime-web";

const sessions: Map<string, ort.InferenceSession> = new Map();

export const loadModel = async (modelName: string, modelUrl: string): Promise<ort.InferenceSession> => {
  if (sessions.has(modelName)) {
    return sessions.get(modelName)!;
  }

  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });

  sessions.set(modelName, session);
  console.info(`Model loaded: ${modelName}`);
  return session;
};

export const getModel = (modelName: string): ort.InferenceSession | undefined => {
  return sessions.get(modelName);
};

export const clearModel = (modelName: string): void => {
  sessions.delete(modelName);
};
