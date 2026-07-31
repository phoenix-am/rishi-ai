# TDD-021: Client View App Technical Specification

## 1. Metadata & Status Block

| Metadata Field | Value |
| :--- | :--- |
| **Document ID** | TDD-021 |
| **Module Name** | ClientViewApp |
| **Version** | v1.0.0 |
| **Status** | IMPLEMENTATION READY |
| **Lifecycle** | Reference |
| **Implementation Status** | Partially Implemented |
| **Owner** | Unassigned |
| **Current Authority** | Level 9 — Technical design reference |
| **Last Verified** | 2026-07-31 |
| **EEP Phase Position** | Phase 8: API Interfaces & Client Shell (Module 8.4) |
| **Exact Prerequisites** | [TDD-018](TDD-018_API_Controller_Module.md) (ApiControllerModule), [TDD-019](TDD-019_Streaming_Module.md) (StreamingModule), [TDD-020](TDD-020_Export_Module.md) (ExportModule) |

---

## 2. Technical Architecture Overview

The `ClientViewApp` represents the user interface wrapper of Rishi AI. Engineered using React, Vite, and tailwind-free vanilla CSS, the app implements a Document-First workspace. Creators interact with a live-synced script editor panel on the left, while a slide-out assistant container manages reference sources, outlines, and block regeneration tools on the right.

### File Placement Layout
```text
src/
└── client/
    ├── main.tsx                # Client app bootstrap entry
    ├── App.tsx                 # Root layout container
    ├── styles/
        └── index.css           # Core typography, themes, and layouts
    ├── components/
    │   ├── EditorWorkspace.tsx # Document-First script block text inputs
    │   ├── AssistantDrawer.tsx # Slide-out sidebar container
    │   └── CurationLibrary.tsx # Source uploads & snapshot widgets
    └── hooks/
        ├── useSseStream.ts     # Real-time token reception hooks
        └── useSyncBlocks.ts    # Debounced state synchronization callbacks
```

### Framework Integration Strategy
- **Document-First Focus:** The editor focuses entirely on script block typing. AI features are "pulled" by the creator from contextual block-level buttons, avoiding intrusive chat boxes.
- **Micro-Animations:** Employs CSS transitions for smooth slide-out motion, glassmorphic panels, and typing token drop-in animations.

---

## 3. Interface & Contract Specification

### Editor Synchronization Hook (`useSyncBlocks.ts`)
```typescript
export interface BlockState {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
}

export function useSyncBlocks(projectId: string) {
  /**
   * Debounces client keystrokes and dispatches API PUT updates to block content.
   * If a block is currently locked, prevents local edits from triggering API writes.
   */
  const syncBlockContent = async (blockId: string, updatedContent: string): Promise<void> => {
    // Debounce wrapper prevents flooding the Fastify network queue
    // Issues: PUT /api/v1/blocks/:blockId
  };

  return { syncBlockContent };
}
```

### SSE Streaming Hook (`useSseStream.ts`)
```typescript
export interface StreamConfig {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (err: any) => void;
}

export function useSseStream() {
  /**
   * Connects to the SSE token stream, feeding tokens to character renderers.
   */
  const startStream = (jobId: string, config: StreamConfig): EventSource => {
    const eventSource = new EventSource(`/api/v1/streams/${jobId}`);
    
    eventSource.addEventListener('token', (event: any) => {
      const data = JSON.parse(event.data);
      config.onToken(data.token);
    });

    eventSource.addEventListener('complete', () => {
      config.onComplete();
      eventSource.close();
    });

    eventSource.onerror = (err) => {
      config.onError(err);
      eventSource.close();
    };

    return eventSource;
  };

  return { startStream };
}
```

---

## 4. Data & Schema Integration

- **Relational Tables Interacted:** Communicates with the backend controller to fetch and mutate `projects`, `script_blocks`, `knowledge_assets`, and `generation_jobs`.
- **Client-Side Optimistic Rendering:** Editors reflect character inputs instantly. A status indicator ("Saving...") reports pending network sync status. If sync fails, the UI reverts back to the last successfully committed state.

---

## 5. Detailed Lifecycle & Error Matrix

### UI Workspace Layout & Drawer Toggle Flow

```text
+-----------------------------------------------------------------------------+
|                                  RISHI AI                                   |
+----------------------------------------+------------------------------------+
|                                        |                                    |
|   Left Editor Panel: Script Blocks     |   Right Drawer: Assistant Panel    |
|   (Document-First Workspace)            |   (Slide-out Context)              |
|                                        |                                    |
|   +--------------------------------+   |   [ Tabs: Sources | Outlines ]     |
|   | Block 1: Vedic Chronology     |   |                                    |
|   | Text edits happen here...      |   |   +----------------------------+   |
|   |                                |   |   | Source: Rigveda Book 1      |   |
|   | [Regenerate] [Lock/Unlock]     |   |   | [Pined] [Cosine Score: 92] |   |
|   +--------------------------------+   |   +----------------------------+   |
|   | Block 2: Linguistic Transition |   |   | Source: Max Muller Essay   |   |
|   | Locked text... [Lock Icon]     |   |   | [Cos: 84]                  |   |
|   +--------------------------------+   |   +----------------------------+   |
|                                        |                                    |
+----------------------------------------+------------------------------------+
```

### Error Matrix

| Error Code / Name | Failure Type | Triggers / Condition | System Response / Recovery Action |
| :--- | :--- | :--- | :--- |
| Stream Dropout | Transient | Client loses internet connection during active SSE playback. | Halts local typing animation, displays a "Stream Interrupted" alert, and prompts the creator to resume generation. |
| Lock Violation Rejection | **FATAL** | Client state gets out-of-sync; user types inside a block the backend marked as locked. | API returns `400 BadRequest`, client editor flashes red and resets input content. |

---

## 6. Testing & Validation Criteria

### Unit Mocking Boundaries
- Mock `EventSource` web APIs to verify token streams feed typing hooks.
- Stub the HTTP client layer to test debounced autosave synchronization delays.

### Vitest Assertions
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSyncBlocks } from './hooks/useSyncBlocks';

describe('useSyncBlocks debounced synchronization hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should debounce input changes and trigger API put requests only after pause', async () => {
    const mockPut = vi.fn().mockResolvedValue({ success: true });
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
      json: () => Promise.resolve({ success: true })
    }));

    const { syncBlockContent } = useSyncBlocks('project-123');

    // Simulate rapid typing keystrokes
    syncBlockContent('block-1', 'V');
    syncBlockContent('block-1', 'Ve');
    syncBlockContent('block-1', 'Ved');

    expect(global.fetch).not.toHaveBeenCalled(); // Blocked by debounce timer

    // Fast-forward debounce window (e.g. 1000ms)
    vi.advanceTimersByTime(1100);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/blocks/block-1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ content: 'Ved' }),
    }));
  });
});
```
