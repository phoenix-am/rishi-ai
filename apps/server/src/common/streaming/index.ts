/**
 * @module common/streaming
 *
 * Base SSE (Server-Sent Events) streaming infrastructure for Rishi AI.
 *
 * This module provides reusable primitives for implementing real-time AI
 * generation streams conforming to the W3C EventSource specification.
 *
 * Exports:
 * - `StreamEventDto` — typed SSE event value object with W3C wire serialisation
 *   and static factories for `chunk`, `done`, and `error` event types.
 * - `SseInterceptor` — NestJS interceptor that transparently converts
 *   `StreamEventDto` emissions to wire-format strings on SSE connections.
 */

export { StreamEventDto } from "./dto/stream-event.dto.js";
export { SseInterceptor } from "./sse.interceptor.js";
