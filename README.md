# voicescore

Voicescore is a desktop application built with Electron and React (using Vite) that provides audio recording and transcription functionalities. This application allows users to record audio, analyze it, and generate transcripts or summaries.

## Project Structure

The project is organized into the following directories and files:

- **voicescore/**: Root directory of the project.
  - **electron/**: Contains the main process files for the Electron application.
    - `main.ts`: Main entry point for the Electron app.
    - `preload.ts`: Preload script for secure communication between processes.
    - **ipc/**: Contains IPC channel definitions.
      - `channels.ts`: Defines IPC channels for communication.
  - **src/**: Contains the React application source code.
    - `main.tsx`: Entry point for the React application.
    - `App.tsx`: Main application component.
    - **components/**: Contains reusable components.
      - `index.ts`: Exports components for easier imports.
    - **hooks/**: Contains custom hooks.
      - `useAudio.ts`: Hook for managing audio functionalities.
    - **pages/**: Contains page components.
      - `Home.tsx`: Main view of the application.
    - **services/**: Contains service files for audio and storage.
      - **audio/**: Functions related to audio processing.
        - `index.ts`: Audio processing functions.
      - **storage/**: Functions for managing local storage.
        - `index.ts`: Local storage functions.
    - **types/**: Contains TypeScript types and interfaces.
      - `index.ts`: Exports types for the application.
    - `vite-env.d.ts`: Type definitions for Vite environment variables.
  - `index.html`: Main HTML file for the application.
  - `vite.config.ts`: Configuration file for Vite.
  - `package.json`: NPM configuration file with scripts and dependencies.
  - `tsconfig.json`: TypeScript configuration file.
  - `tsconfig.node.json`: Node.js specific TypeScript configuration.
  - `.gitignore`: Specifies files to ignore in Git.
  - `README.md`: Documentation for the project.

## Installation

To get started with Voicescore, follow these steps:

1. Install dependencies:
   ```
   npm install
   ```

2. Run in development mode:
   ```
   npm run dev
   ```

3. Build the production bundle:
   ```
   npm run build
   ```

4. Package into a folder with an .exe:
   ```
   npm run dist
   ```

## Features

- Audio recording and playback.
- Transcription and summarization of recorded audio.
- User-friendly interface built with React.
- Secure communication between the main and renderer processes using Electron's IPC.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.