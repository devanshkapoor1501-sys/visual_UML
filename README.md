# UML Studio

UML Studio is a private, local-first desktop UML modeling workspace built with Electron, React, TypeScript, Vite, and `@xyflow/react`.

It provides a professional modeling workflow without an account, server, cloud sync, or external project service. Projects are stored as readable `.umlproj` JSON files on the local machine.

## Features

- Class, object, package, component, deployment, use-case, activity, state-machine, sequence, and communication diagrams.
- Reusable model elements shared across diagrams.
- Typed UML relationships with labels, multiplicities, guards, and relationship-specific validation.
- Three-pane workspace with project navigator, zoomable canvas, palette, and inspector.
- Light, dark, and system themes with persisted workspace preferences.
- Selection, multi-selection, drag-and-drop layout, alignment, distribution, duplication, deletion, clipboard support, undo, and redo.
- Grid, snapping, guides, rulers, minimap, zoom, fit-to-content, contextual menus, and command palette.
- Local Save, Open, Save As, autosave recovery, SVG export, and PNG export.
- Cross-platform packaging targets for Windows, macOS, and Linux.

## Download the latest Windows installer

The latest verified Windows installer is available in the repository:

[`release/UML Studio Setup 0.1.0.exe`](release/UML%20Studio%20Setup%200.1.0.exe)

The installer is currently unsigned, so Windows may show the standard SmartScreen warning for an unknown publisher.

## Development

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and start the development workspace:

```bash
npm install
npm run dev
```

Run the automated tests and type check:

```bash
npm test -- --run
npx tsc -p tsconfig.json --noEmit
```

Create production builds:

```bash
npm run build
```

Build artifacts are written to `release/`.

## Project structure

```text
src/
  main/       Electron main process and local file dialogs
  preload/    Secure renderer bridge
  renderer/   React workspace, canvas, panels, and state
  shared/     UML model types, validation, and serialization
tests/        Model, serialization, relationship, and history tests
```

## Data and privacy

UML Studio is local-first. Project files, autosave data, and UI preferences stay on the local device. Version 1 does not include accounts, collaboration, cloud synchronization, AI, code generation, or reverse engineering.

## Status

This is an early personal-use release. The core multi-diagram modeling, local persistence, export, and desktop packaging workflows are implemented and covered by automated and live smoke tests.
