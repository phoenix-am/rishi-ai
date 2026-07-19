/**
 * Represents a single event emitted over an SSE (Server-Sent Events) stream.
 *
 * The shape follows the W3C EventSource spec:
 * - `data`  — the payload string (required).
 * - `id`    — optional event ID, allows clients to resume with `Last-Event-ID`.
 * - `event` — optional named event type (default: `"message"`).
 * - `retry` — optional reconnection timeout in milliseconds.
 *
 * Higher-level code should serialise the `payload` field to JSON before placing
 * it here, so that the wire format contains machine-parseable structured data.
 *
 * @example
 * ```ts
 * const event: StreamEventDto = {
 *   id: '1',
 *   event: 'chunk',
 *   data: JSON.stringify({ text: 'Hello', done: false }),
 * };
 * ```
 */
export class StreamEventDto {
  /**
   * Raw string data for this event.
   * Serialise objects to JSON before assigning.
   */
  readonly data: string;

  /** Optional event identifier for client-side resumption. */
  readonly id?: string;

  /**
   * Named event type.
   * @default "message"
   */
  readonly event?: string;

  /**
   * Reconnection timeout (ms) broadcasted to the client.
   * Instructs the client's EventSource to wait this many ms before retrying.
   */
  readonly retry?: number;

  constructor(params: { data: string; id?: string; event?: string; retry?: number }) {
    this.data = params.data;
    this.id = params.id;
    this.event = params.event;
    this.retry = params.retry;
  }

  // ---------------------------------------------------------------------------
  // Static factories for common AI generation event types
  // ---------------------------------------------------------------------------

  /**
   * Creates a "chunk" event carrying a partial AI generation result.
   */
  static chunk(text: string, id?: string): StreamEventDto {
    return new StreamEventDto({
      event: "chunk",
      data: JSON.stringify({ text, done: false }),
      id,
    });
  }

  /**
   * Creates a "done" event signalling the end of an AI generation stream.
   */
  static done(id?: string): StreamEventDto {
    return new StreamEventDto({
      event: "done",
      data: JSON.stringify({ done: true }),
      id,
    });
  }

  /**
   * Creates an "error" event carrying a machine-readable error payload.
   */
  static error(message: string, code = "STREAM_ERROR", id?: string): StreamEventDto {
    return new StreamEventDto({
      event: "error",
      data: JSON.stringify({ error: { code, message } }),
      id,
    });
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  /**
   * Serialises the event into a raw SSE wire-format string.
   *
   * The W3C spec requires each field on its own line, with fields terminated
   * by `\n`, and events separated by a blank line (`\n\n`).
   *
   * @see https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events
   */
  toWireFormat(): string {
    const lines: string[] = [];

    if (this.id !== undefined) {
      lines.push(`id: ${this.id}`);
    }

    if (this.event !== undefined) {
      lines.push(`event: ${this.event}`);
    }

    if (this.retry !== undefined) {
      lines.push(`retry: ${this.retry}`);
    }

    // The `data` field may be multi-line — each line must be prefixed
    const dataLines = this.data.split("\n");
    for (const line of dataLines) {
      lines.push(`data: ${line}`);
    }

    return lines.join("\n") + "\n\n";
  }
}
