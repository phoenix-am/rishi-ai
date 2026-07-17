# TypeScript Configuration System

This directory houses the inherited TypeScript configurations for the Rishi AI monorepo.

## Configurations

1. **`tsconfig.base.json`**: Root options including strict mode verification, map generations, and composite project referencing directives.
2. **`tsconfig.node.json`**: Inherits from `tsconfig.base.json` and targets Node.js environments. Used by the server app and package modules.
3. **`tsconfig.dom.json`**: Configured for browser/DOM runtimes using React + Vite. Sets modules to ESNext/Bundler and disables file outputs (`noEmit`).

## Relationship with the Engineering Constitution

Adheres to **Technical Philosophy** and **Zero Circular Dependencies** by organizing codebase layers into strict compile-time project references.
