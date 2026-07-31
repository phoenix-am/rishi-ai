# STATUS: FROZEN (v1.0.0)

# Product Requirements Document (PRD)

| Metadata Field | Value |
| :--- | :--- |
| **Document Name** | Product Requirements Document (PRD) |
| **Version** | 1.0.0 |
| **Status** | Frozen |
| **Last Updated** | 2026-07-16 |
| **Owner** | Rishi AI Founder & CTO |
| **Lifecycle** | Current |
| **Current Authority** | Level 2 — Product requirements |
| **Review Status** | Product-scope amendment requires Product Owner approval |
| **Last Verified** | 2026-07-31 |
| **Change Summary** | Frozen Baseline incorporating validation strategy, pipeline stages, progressive disclosure organization, block architecture, passwordless security, and data snapshot rules. |

---

## Traceability & Alignment
* **Parent Document:** [ENGINEERING_CONSTITUTION.md](ENGINEERING_CONSTITUTION.md) (Establishes core vision, constraints, and architecture philosophy)
* **Downstream Target:** [Domain Model Specification (DMS)](DOMAIN_MODEL_SPECIFICATION.md) (Defines logical models and states from these requirements)

---

## 1. Executive Summary & Core Product Hypothesis

### 1.1 The Core Problem Statement
Educational content creators operating in research-heavy niches (Sanatan Dharma, Vedic Knowledge, Jyotish, and Ancient Indian History) waste significant operational energy on two compounding workflow taxes:
* **The Hallucination & Accuracy Tax:** Standard Large Language Models regularly invent scriptural citations, mangle complex historical timelines, and offer flawed translations of nuanced Sanskrit terminology. Creators spend hours manually verifying facts to preserve educational integrity.
* **The Context Fragmentation Tax:** Traditional AI tools treat workflows as isolated chat threads or linear text boxes. As a project progresses from initial research to outline and script writing, context degrades or is lost entirely. Creators find themselves repeatedly re-explaining target tones, core source constraints, and baseline goals to the AI.

### 1.2 The Monetization Thesis
Rishi AI bets that specialized creators will pay a premium subscription fee for an intensely specialized, text-only workflow because it directly optimizes their time economics. The platform transforms a 3-day research and scripting bottleneck into a 30-minute structured review by prioritizing context-preservation and trusted domain-grounding over commoditized media asset generation.

### 1.3 Core Product Assumptions
1. Target creators value factual accuracy, source attribution, and deep contextual continuity far more than native voice, image, or video generation wrappers.
2. Creators will proactively seed or curate personal reference libraries to guarantee historical and philosophical fidelity.
3. A clean, text-only export suite (Markdown, PDF, DOCX) provides a flawless, non-disruptive bridge to their existing external recording and editing pipelines.

### 1.4 Validation & Experimentation Strategy (The 30-Day Cohort Test)
The MVP will launch as a closed validation experiment with an initial cohort of 20 to 30 active educational creators in the Sanatan Dharma and history niches. 
* **The Threshold:** Users are granted a free trial allocation sufficient to generate 5 complete, deeply grounded, context-preserved scripts.
* **The Paywall:** Upon attempting to initialize a 6th project, the workspace presents a flat monthly subscription wall to capture validation metrics.

### 1.5 Success Metrics & Failure Criteria

#### Quantitative Success Metrics
* **Workflow Completion Rate:** >60% of initialized projects successfully transition through all 9 structural pipeline stages to final export.
* **Organic Conversion Rate:** >=10% of the active trial cohort submits payment credentials upon hitting the subscription paywall.
* **Context Retention Index:** High reuse of upstream data attributes inside the final script body without manual context re-entry.

#### Quantitative Failure Criteria
* **The "Chatbox Copy-Paste" Reversion:** Users complete background research inside Rishi AI but abandon the platform mid-pipeline to write their scripts elsewhere.
* **Zero Willingness-to-Pay:** High user satisfaction metrics but a 0% conversion rate at the milestone paywall, indicating a "nice-to-have" utility rather than a viable SaaS business.
* **High Churn Due to Cognitive Load:** Creators report that review mechanisms feel like a complex version-control chore rather than an ambient writing assistant.

---

## 2. Target User Personas & Scope Boundaries

### 2.1 Primary Persona: The Solo Independent Educational Creator
The exclusive target user driving 100% of MVP feature prioritization:
* **Characteristics:** Operates a solo YouTube channel, educational newsletter, or deep-dive spiritual blog. Acts simultaneously as primary researcher, copywriter, narrator, and editor.
* **Workflow:** Researches topics deeply, drafts scripts block-by-block, records audio via a teleprompter, and uses external software for video compilation.
* **Needs:** Speed, factual confidence, easy reference retrieval, and absolute preservation of theme across days of asynchronous work.

### 2.2 Secondary Persona (Post-MVP Roadmap)
* **The Profile:** The Educational Content Studio Lead.
* **Deferred Capabilities:** Managing distributed teams, task assignment, multi-user simultaneous editing, organizational multi-workspace billing, and structural review/approval pipelines are explicitly excluded from the MVP.

### 2.3 Comprehensive Boundary Exclusions (Version 1.0.0)
To maximize development velocity and respect strict financial constraints, the following components are explicitly designated as out-of-scope:
* **Content Production Media Extensions:** Generative voice synthesis, AI text-to-speech, generative image illustration, automated B-roll assembly, thumbnail generation, and music tracking.
* **Publishing & Distribution:** Direct YouTube API publishing suites, cross-platform social media schedulers, and native SEO keywords injection tracking.
* **Enterprise Requirements:** Single Sign-On (SSO), advanced compliance auditing, and departmental multi-tier role hierarchies.

---

## 3. Layered Knowledge Architecture & Retrieval Strategy

### 3.1 The Knowledge Hierarchy
To ensure authoritative content and prevent token-bloat expenses, the system aggregates data using a prioritized 4-tier knowledge stack:

| Priority | Layer | Functional Behavior | MVP Implementation Constraint |
| :--- | :--- | :--- | :--- |
| **1 (Highest)** | **Project Knowledge** | Canonical source of truth for the active project. Comprises specific project uploads, manual creator notes, and approved AI inputs. | Scoped tightly to individual project execution bounds. |
| **2** | **Personal Knowledge Library** | Reusable cross-project assets owned by the creator (e.g., favorite translations, recurring style guides). | Modeled via simple relationships to map assets across a single user's project index. |
| **3** | **Platform Knowledge Library** | Pre-seeded, read-only collection of out-of-copyright scriptural, philosophical, and historical source texts. | Curated strictly for the initial Vedic/Ancient Indian launch niche to minimize cold-start friction. |
| **4 (Lowest)** | **Public Knowledge Sources** | External web scraping and live search queries used purely as a fallback mechanism. | Bound by strict internal rate limits to control underlying API overhead. |

### 3.2 The Working Context Principle
The raw contents of the Layered Knowledge Architecture are never dumped directly into an AI prompt. 
* **Mechanic:** The system extracts core semantic concepts from the user's workflow stage, queries the Knowledge Hierarchy sequentially, and compresses the matched fragments into a lean, highly optimized **Working Context Window**.
* **Objective:** This transient context serves as the absolute perimeter for subsequent AI execution, guaranteeing predictable execution speeds, minimal token overhead, and high factual accuracy.

---

## 4. Functional Workflow & Progressive Disclosure Workspace

### 4.1 The 9-Stage Production Pipeline
The platform guides the solo creator through a sequential production lifecycle, preserving context at every boundary while leaving creative freedom fully intact:
1. **Project Creation:** Initializing the project shell and container memory (`draft` state).
2. **Idea Capture & Research:** Submitting raw themes, target durations, and baseline objectives, and executing knowledge retrieval (`research` state).
3. **Knowledge Organization:** Reviewing and structuring gathered assets (`knowledge_organized` state).
4. **Working Context Generation:** Compressing curated vectors into the active context window (`working_context_generated` state).
5. **Outline Generation:** Mapping the thematic chapters of the script (`outline_generated` state).
6. **Script Generation:** Building out the body text block-by-block (`script_generated` state).
7. **Review:** Final editorial review and proofreading (`review` state).
8. **Exported:** Compiling into clean formatting options (Markdown, PDF, DOCX) and marking as exported (`exported` state).
9. **Archived:** Freezing the project as read-only for future reference or reactivation (`archived` state).

### 4.2 Progressive Disclosure Knowledge Organization (Stage 4)
The user interaction layer implements a strict **Product Principle**: *Complexity remains hidden until explicitly requested.*

#### A. The Default View (Intelligent Curation Summary)
The system presents a clean, automated, AI-synthesized summary page. Before rendering, the backend forces the data through six transformations:
* *Deduplication:* Stripping overlapping historical or reference data.
* *Concept Clustering:* Grouping semantic arguments into clean topical buckets.
* *Entity Identification:* Auto-extracting load-bearing people, locations, and scriptures.
* *Timeline Mapping:* Generating chronological sequences for historical items.
* *Anomaly Detection:* Highlighting contradictions between distinct source layers or translations.
* *Confidence Estimation:* Assigning a qualitative reliability index based on source grounding strength.

#### B. The Advanced View (The Knowledge Workspace)
Creators demanding deeper control can open the optional **Explore Sources** window. This layer progressively discloses the background engine data:
* *Source Cards:* High-granularity citation blocks linking directly back to the original text layers.
* *Interaction Handlers:* Quick-action controls allowing users to explicitly **Pin** (force include in downstream steps), **Reject** (omit from context), **Merge**, or **Mark as Trusted**.

---

## 5. Content Generation Engine & Script Block Architecture

### 5.1 The Editorial Script Schema
The final output deliverable is an **Editorial Script** optimized entirely for verbal recording and analytical precision. Every generated script asset contains 12 core metadata and text fields:
1. *Title* | 2. *Objective* | 3. *Target Audience* | 4. *Estimated Duration* | 5. *Tone* | 6. *Key Takeaways* | 7. *Introduction* | 8. *Main Sections (Chapters)* | 9. *Conclusion* | 10. *References* | 11. *Fact-Check Notes* | 12. *Open Questions*.

### 5.2 Script Block Architecture
To optimize iteration speeds and enforce our strict unit economics, the document body is partitioned into independent, ordered data structures called **Script Blocks**.

#### Core Functional Constraints
* **Isolated State Caching:** Each individual block retains a reference vector to its own subset of the Working Context Window, shielding it from global document changes.
* **Targeted Regeneration:** Creators can isolate a single problematic section and trigger a rewrite command on that specific block alone. The system re-executes the prompt using only the local block's context, keeping costs minimal and leaving surrounding blocks untouched.
* **Reordering Logic:** Blocks support fluid positional shifting, dynamically updating their logical sequencing index in the project file system.

### 5.3 Native Script Metadata Panel
Every script view exposes real-time contextual analytics:
* *Speaking Pacing Indicator:* Translating word count into real-time reading and recording time estimates.
* *Confidence Level:* A percentage score mapping how tightly the generated vocabulary matches verified reference text chunks.
* *Source Coverage Map:* A visual breakdown showing exactly which knowledge hierarchy layers contributed to the block's text.

---

## 6. The Editing Interface & Script Interaction Layer

### 6.1 Document-First Inline Editor
The platform prioritizes creator autonomy by employing a **Document-First, AI-Second** design paradigm. 
* The interface displays a clean, traditional word-processing viewport. 
* The creator can click directly into any Script Block and begin typing manual changes instantly. 
* No intrusive AI widgets or floating dialog boxes block the writing environment.

### 6.2 The Contextual Lock Mechanism
Each Script Block includes a manual privacy toggle. When a block is marked as `Locked`, it is entirely hidden from the background AI orchestration layer. Global project updates or automated synchronization commands bypass locked blocks completely, guaranteeing absolute safety for user modifications.

### 6.3 The Pull-Based Assistant Drawer
AI capabilities operate strictly on user demand. Selecting a text snippet or clicking a block's action prompt opens a hidden utility drawer exposing 9 specific commands:
* *Rewrite* | *Expand* | *Shorten* | *Simplify* | *Improve Flow* | *Add References* | *Fact Check* | *Regenerate Block* | *Explain Reasoning*.

### 6.4 Non-Destructive Suggestion Layer
The platform treats AI prompt outputs as suggestions, never as immediate code or text replacements.
* **The Visual Review Loop:** Modifications return in a distinct code-review style diff interface showing additions and deletions clearly.
* **Resolution Gates:** The user retains final veto power, requiring an explicit interaction to select **Accept**, **Reject**, **Compare**, or **Keep Existing**.

---

## 7. Identity, Security & Extensible Authorization

### 7.1 Passwordless Identity Management
To ensure a secure, maintenance-free account footprint and eliminate the risks of credential database storage, authentication is restricted to:
* **Passwordless Email OTP:** The user inputs an email, receives a short-lived numeric code in their inbox, and submits it to verify session access.
* **Google OAuth:** Instant federated authentication utilizing secure Google tokens.

### 7.2 Isolated Authorization Model
The system decoupled identity from permission handling from day one:
* **Tenant Isolation:** The authorization core must structurally validate that the current authenticated ID matches the designated owner index of the target Project Container before permitting any read or write mutations.
* **Multi-Tenant Runway:** While scoped to a solo creator layout, the entity relationship mapping must treat permissions as a bridge table between users and projects, allowing smooth insertion of future collaborative roles (`Editor`, `Reviewer`) post-validation.

---

## 8. Business Rules for Historical Data

### 8.1 The Snapshot Reference Model
To guarantee project reproducibility and secure absolute user trust, the platform enforces data immutability at the execution layer:
* **Immutability Threshold:** When a user links an asset from their Personal Knowledge Library to an active Project, the system captures an unalterable **Knowledge Snapshot** freezing the asset's exact text and version index at that moment.
* **Decoupled Lifecycle:** Future edits, formatting updates, or clean-ups performed on the primary item inside the Personal Knowledge Library will never silently modify or corrupt the data footprint of in-progress or archived projects.

### 8.2 Ambient Drift Management
* Upstream updates do not trigger automated cascading rewrites downstream. 
* Instead, if an underlying library asset version changes, the UI displays a non-blocking **Context Drift Indicator** on the affected workspace blocks. 
* The creator retains absolute authority to manually initiate a contextual sync or maintain their current text layout indefinitely.

---

## 9. Deferral Boundaries & System Design Roadmap
Per our Documentation Boundary, the specific technical choices governing the following items are intentionally omitted from this business requirement set and are deferred entirely to the downstream **System Design Document (SDD)**:
1. *Physical technology stacks, frameworks (e.g., frontend/backend runtimes), and Monorepo orchestration tooling.*
2. *Database provider selection, ORM libraries, and physical vector clustering paradigms.*
3. *Third-party authentication framework engines, token mechanics (JWT vs. stateful sessions), and email delivery transactional APIs.*
4. *Exact markdown compilation algorithms and cloud/local object storage hosting vendors.*
