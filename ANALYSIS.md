## Part 1: ANALYSIS.md - The Codebase Deep Dive

This document provides a detailed analysis of the `gemini-cli` source code. The goal is to understand the current architecture to identify exactly where changes are needed to decouple it from Google's backend and ensure data confidentiality.

### Project Structure

The `gemini-cli` project is a TypeScript monorepo, managed via npm workspaces. The key packages are located in the `packages/` directory:

*   **`packages/cli`**: Contains the command-line interface (CLI) application. It handles argument parsing, user interaction (using the Ink framework for its interactive UI), and orchestrates the calls to the core logic.
*   **`packages/core`**: The heart of the application. It contains the business logic, including API communication, configuration management, data handling, and telemetry.
*   **`packages/vscode-ide-companion`**: A VS Code extension that integrates with the CLI. This is out of scope for the current refactoring goals.
*   **`docs/`**: Contains all project documentation. `docs/telemetry.md` is particularly relevant.
*   **`scripts/`**: Contains various build and utility scripts, including some related to telemetry.

### Entry Point & Core Logic

*   **Entry Point**: The main entry point for the CLI is `packages/cli/index.ts`. It parses the command-line arguments and determines whether to run in interactive or non-interactive mode.
*   **Interactive Mode**: For interactive sessions, `packages/cli/src/gemini.tsx` is invoked. This file sets up the React-based terminal UI using Ink.
*   **Non-Interactive Mode**: For single-shot commands, `packages/cli/src/nonInteractiveCli.ts` handles the execution flow.
*   **Core Logic Orchestration**: Both entry points ultimately rely on the `GeminiClient` class located in `packages/core/src/core/client.ts`. This class is the central orchestrator, responsible for managing the chat history, applying system prompts, and calling the underlying language model.

### API Communication Layer

The responsibility of communicating with the LLM backend is clearly defined and located within `packages/core`.

*   **Central Client**: The `GeminiClient` class (`packages/core/src/core/client.ts`) is the primary consumer of the LLM API. It does not call the Google API directly but delegates this to a `ContentGenerator` object.
*   **`ContentGenerator` Abstraction**: The actual API calls are encapsulated within a `ContentGenerator` object, which is created by the `createContentGenerator` function in `packages/core/src/core/contentGenerator.ts`. This function acts as a factory, creating a concrete generator that is tightly coupled to the `@google/genai` SDK.
*   **SDK Usage**: The project uses the `@google/genai` npm package (version `1.13.0` at the time of analysis) to handle all communication with the Google Gemini API. Key methods used are `generateContent`, `sendMessage`, and `embedContent`.
*   **Authentication**: Authentication is managed by the `google-auth-library` package. The `ContentGenerator` is initialized with authentication details, which are retrieved based on the user's configuration (API key or Google account login). This logic is concentrated in `packages/core/src/core/contentGenerator.ts`.

### Data Handling & Payloads

*   **Data Structures**: The application uses the data structures provided by the `@google/genai` SDK, primarily `Content` and `Part`, to construct the prompts and process the responses.
*   **Prompt Construction**: The `GeminiClient` is responsible for assembling the final payload sent to the model. It combines the chat history, system instructions (from `packages/core/src/core/prompts.ts`), and the current user prompt into the `Content` format.
*   **Response Parsing**: The `GeminiClient` and the UI layer (`packages/cli/src/ui/hooks/useGeminiStream.ts`) handle the streaming response from the API, parsing the `Part` objects to extract text, function calls, and other metadata.

### Configuration

The tool's configuration system is centralized and well-defined.

*   **Configuration Files**: The tool uses YAML files for configuration, primarily `.gemini/config.yaml` for project-specific settings and `~/.gemini/config.yaml` for global settings. It also uses `.gemini/settings.json` for settings like telemetry.
*   **`Config` Class**: The `Config` class in `packages/core/src/config/config.ts` is responsible for loading, parsing, and providing access to all configuration values. It merges settings from different files and environment variables.
*   **Key Options**: Relevant configuration options include `model`, `embeddingModel`, `apiKey`, and settings related to telemetry and usage statistics.

### Telemetry and Data Leakage

The analysis uncovered two distinct mechanisms for sending data to external servers, both of which pose a significant data confidentiality risk.

1.  **OpenTelemetry (OTEL) System**:
    *   **Description**: The application includes a comprehensive, opt-in telemetry system built on OpenTelemetry, as detailed in `docs/telemetry.md`.
    *   **Implementation**: The code resides in `packages/core/src/telemetry/`. The `sdk.ts` file initializes the OTEL pipeline.
    *   **Data Leakage Point**: This system can be configured to send telemetry data to Google Cloud Platform via the `telemetry.target: "gcp"` setting. The logs can include sensitive information, including the full text of user prompts (`gemini_cli.user_prompt`) if `telemetry.logPrompts` is enabled.

2.  **`ClearcutLogger`**:
    *   **Description**: This is a non-configurable, hardcoded telemetry system that is much more concerning from a privacy perspective.
    *   **Implementation**: The code is located in `packages/core/src/telemetry/clearcut-logger/clearcut-logger.ts`.
    *   **Data Leakage Point**: This logger sends a variety of usage events and metadata directly to a hardcoded Google endpoint (`https://play.googleapis.com/log`). It is designed to run automatically if `usageStatistics` is enabled in the configuration. Crucially, it attempts to identify the user by sending their Google account email (`getCachedGoogleAccount`) or a unique installation ID (`getInstallationId`). This functionality represents a direct and non-obvious channel for data exfiltration.
