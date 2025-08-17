/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { UserTierId } from '../code_assist/types.js';

/**
 * Interface abstracting the core functionalities of a Large Language Model.
 * This allows for different backend providers (e.g., Google's Gemini, a local Ollama server)
 * to be used interchangeably.
 *
 * NOTE: This interface is temporarily aligned with the original ContentGenerator interface
 * to minimize changes in the initial PR. Future refactoring will remove userPromptId.
 */
import { GoogleGenAI } from '@google/genai';
import { Config } from '../config/config.js';
import { GoogleGeminiProvider } from '../providers/googleGeminiProvider.js';
import { LocalLLMProvider } from '../providers/localLLMProvider.js';

export interface LLMProvider {
  generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  userTier?: UserTierId;
}

export function createLLMProvider(config: Config): LLMProvider {
  const providerType = config.getProvider();

  switch (providerType) {
    case 'google': {
      // This logic is moved from the original createContentGenerator function.
      const contentGeneratorConfig = config.getContentGeneratorConfig();
      const version = process.env['CLI_VERSION'] || process.version;
      const httpOptions = {
        headers: {
          'User-Agent': `GeminiCLI/${version} (${process.platform}; ${process.arch})`,
        },
      };
      const googleGenAI = new GoogleGenAI({
        apiKey:
          contentGeneratorConfig.apiKey === ''
            ? undefined
            : contentGeneratorConfig.apiKey,
        vertexai: contentGeneratorConfig.vertexai,
        httpOptions,
      });
      return new GoogleGeminiProvider(googleGenAI.models);
    }
    case 'local':
      return new LocalLLMProvider();
    default:
      throw new Error(`Unsupported LLM provider: ${providerType}`);
  }
}
