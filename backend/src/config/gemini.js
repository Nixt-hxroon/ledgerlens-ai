import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './env.js';

let genAI = null;

if (config.gemini.isConfigured) {
  genAI = new GoogleGenerativeAI(config.gemini.apiKey);
}

export const getGeminiModel = (modelName = config.gemini.model) => {
  if (!genAI) {
    if (config.gemini.apiKey) {
      genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    } else {
      return null;
    }
  }
  return genAI.getGenerativeModel({ model: modelName });
};

export { genAI };

