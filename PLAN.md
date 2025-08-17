## Part 2: PLAN.md - The Refactoring Roadmap

This document outlines a detailed, step-by-step plan to refactor the `gemini-cli` tool. The primary goals are to enable communication with local LLMs and to harden the tool's security by removing all third-party data transmission. The plan is structured as a series of actionable tasks, suitable for individual pull requests.

### Task 1: Abstract the Model Backend

The goal of this task is to break the hard dependency on the `@google/genai` SDK by introducing a generic provider interface.

*   **1.1: Define `LLMProvider` Interface**
    *   Create a new file `packages/core/src/core/llmProvider.ts`.
    *   In this file, define a TypeScript interface named `LLMProvider`.
    *   This interface should standardize the core methods needed for LLM communication, based on the methods currently used in `GeminiClient` and `ContentGenerator`. The interface should include methods like:
        *   `generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse>`
        *   `generateContentStream(request: GenerateContentRequest): AsyncGenerator<GenerateContentResponse>`
        *   `countTokens(request: CountTokensRequest): Promise<CountTokensResponse>`
        *   `embedContent(request: EmbedContentRequest): Promise<EmbedContentResponse>`

*   **1.2: Create `GoogleGeminiProvider`**
    *   Create a new file `packages/core/src/providers/googleGeminiProvider.ts`.
    *   Implement a `GoogleGeminiProvider` class that conforms to the `LLMProvider` interface.
    *   Move the existing API communication logic from `packages/core/src/core/contentGenerator.ts` into this new class. This class will wrap the `@google/genai` SDK.
    *   The constructor of this class should accept the necessary configuration (API key, etc.) to instantiate the SDK.

### Task 2: Implement a Local LLM Provider

This task involves creating a new provider that can communicate with any generic, Ollama-compatible local LLM server.

*   **2.1: Create `LocalLLMProvider`**
    *   Create a new file `packages/core/src/providers/localLLMProvider.ts`.
    *   Implement a `LocalLLMProvider` class that also conforms to the `LLMProvider` interface.
    *   The constructor should accept the local server's URL (e.g., `http://localhost:11434`).
    *   Implement the `generateContentStream` method to make a `POST` request to the local endpoint (e.g., `/api/generate`). This will require using a standard HTTP client like `fetch`.
    *   The implementation must handle the mapping between the generic `LLMProvider` request/response formats and the specific format expected by the local LLM API (e.g., the Ollama API format).

### Task 3: Update Configuration System

This task will modify the configuration system to allow users to select and configure their desired provider.

*   **3.1: Add Provider Selection to Config**
    *   Modify the `Config` class in `packages/core/src/config/config.ts` and the associated YAML schema.
    *   Add a new top-level configuration option, `provider`, which can be set to either `google` (default) or `local`.
*   **3.2: Add Local Provider Configuration**
    *   Add a new configuration section, `localProvider`, to the config.
    *   Inside this section, add an `url` option to specify the endpoint for the local LLM server.
    *   Add other potential options like `model` to specify the local model name.

### Task 4: Integrate the Provider System

This task involves modifying the core application logic to use the new provider system.

*   **4.1: Create a Provider Factory**
    *   In `packages/core/src/core/llmProvider.ts` (or a new factory file), create a function `createLLMProvider(config: Config): LLMProvider`.
    *   This function will read the `provider` from the config and instantiate the appropriate provider (`GoogleGeminiProvider` or `LocalLLMProvider`), passing the relevant configuration to its constructor.
*   **4.2: Refactor `GeminiClient`**
    *   Modify the `GeminiClient` class (`packages/core/src/core/client.ts`).
    *   Remove the direct dependency on `ContentGenerator`.
    *   Instead, the `GeminiClient` constructor should accept an instance of `LLMProvider`.
    *   Update the `initialize` method of `GeminiClient` to use the new provider factory to get the selected provider.
    *   Update all internal method calls (e.g., `sendMessageStream`, `generateJson`) to call the methods on the `llmProvider` instance instead of the old `contentGenerator`.

### Task 5: Security & Privacy Hardening

This is a critical task to ensure the tool is safe for use with confidential data. It involves the complete removal of all telemetry and external data reporting features.

*   **5.1: Remove `ClearcutLogger`**
    *   Delete the entire `packages/core/src/telemetry/clearcut-logger/` directory.
    *   Search the codebase for any import or usage of `ClearcutLogger` and remove it. This includes the call in `packages/core/src/core/client.ts`.
    *   Remove the `usageStatistics` option from the configuration system.
*   **5.2: De-fang OpenTelemetry**
    *   Modify the OTEL implementation in `packages/core/src/telemetry/`.
    *   Completely remove the logic that allows for the `gcp` target. The tool should not have any built-in capability to send telemetry to Google Cloud.
    *   The telemetry system should be restricted to `local` file-based or OTLP exporting only.
    *   Modify `docs/telemetry.md` to remove all references to the `gcp` target.
*   **5.3: Remove Prompt Logging**
    *   In the remaining OTEL code, permanently disable the logging of user prompts. Remove the `telemetry.logPrompts` configuration and any code that uses it to include `gemini_cli.user_prompt` log events.

### Task 6: Documentation Update

The final task is to update the documentation to reflect the new capabilities.

*   **6.1: Update `README.md`**
    *   Add a new section to `README.md` explaining how to use `gemini-cli` with a local LLM.
    *   Provide a clear example of the new configuration required in `config.yaml` (selecting the `local` provider and setting the URL).
*   **6.2: Create `PROVIDERS.md`**
    *   Create a new document, `docs/providers.md`, that details the provider architecture.
    *   Explain the `LLMProvider` interface for developers who may want to add new providers in the future.
    *   Document the configuration for both the `google` and `local` providers.
