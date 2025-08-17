/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
  GenerateContentResponse,
  FinishReason,
} from '@google/genai';
import { LLMProvider } from '../core/llmProvider.js';
import { UserTierId } from '../code_assist/types.js';

/**
 * A mocked LLMProvider that simulates a local LLM server.
 * It returns hardcoded responses for testing the provider-switching mechanism.
 */
export class LocalLLMProvider implements LLMProvider {
  readonly userTier?: UserTierId = undefined;

  constructor() {
    // In a real implementation, this would take a URL for the local server.
  }

  async generateContent(
    _request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const response = new GenerateContentResponse();
    response.candidates = [
      {
        index: 0,
        content: {
          role: 'model',
          parts: [{ text: 'This is a mocked response from the local LLM.' }],
        },
        finishReason: FinishReason.STOP,
        safetyRatings: [],
      },
    ];
    response.usageMetadata = {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
    };
    return response;
  }

  async generateContentStream(
    _request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const self = this;
    return (async function* () {
      yield await self.generateContent(_request, _userPromptId);
    })();
  }

  async countTokens(
    _request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    return {
      totalTokens: 10,
    };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    return {
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    };
  }
}
