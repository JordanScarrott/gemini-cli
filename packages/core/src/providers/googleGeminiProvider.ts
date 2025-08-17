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
  Models,
} from '@google/genai';
import { LLMProvider } from '../core/llmProvider.js';
import { UserTierId } from '../code_assist/types.js';

/**
 * An LLMProvider that connects to Google's Gemini API.
 * This class is a thin wrapper around the `Models` object
 * from the `@google/genai` SDK.
 */
export class GoogleGeminiProvider implements LLMProvider {
  // The `models` object from the genai SDK doesn't have userTier, so we hardcode it.
  readonly userTier?: UserTierId = undefined;

  private readonly models: Models;

  constructor(models: Models) {
    this.models = models;
  }

  async generateContent(
    request: GenerateContentParameters,
    // userPromptId is ignored by this provider, but required by the interface
    // for compatibility during the refactor.
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    return this.models.generateContent(request);
  }

  async generateContentStream(
    request: GenerateContentParameters,
    // userPromptId is ignored by this provider, but required by the interface
    // for compatibility during the refactor.
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.models.generateContentStream(request);
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    return this.models.countTokens(request);
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    return this.models.embedContent(request);
  }
}
