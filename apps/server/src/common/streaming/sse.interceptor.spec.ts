import { describe, it, expect } from "vitest";
import { of, firstValueFrom } from "rxjs";
import { SseInterceptor } from "./sse.interceptor.js";
import { StreamEventDto } from "./dto/stream-event.dto.js";

function buildContext(acceptHeader: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { accept: acceptHeader },
      }),
    }),
  } as any;
}

function buildCallHandler(value: any) {
  return {
    handle: () => of(value),
  } as any;
}

describe("SseInterceptor", () => {
  const interceptor = new SseInterceptor();

  describe("when Accept header is NOT text/event-stream", () => {
    it("should pass the value through unchanged", async () => {
      const context = buildContext("application/json");
      const handler = buildCallHandler({ id: "abc" });

      const result$ = interceptor.intercept(context, handler);
      const emitted = await firstValueFrom(result$);

      expect(emitted).toEqual({ id: "abc" });
    });
  });

  describe("when Accept header IS text/event-stream", () => {
    it("should convert a StreamEventDto to its wire-format string", async () => {
      const context = buildContext("text/event-stream");
      const event = StreamEventDto.chunk("Hello world");
      const handler = buildCallHandler(event);

      const result$ = interceptor.intercept(context, handler);
      const emitted = await firstValueFrom(result$);

      expect(typeof emitted).toBe("string");
      expect(emitted).toContain("event: chunk\n");
      expect(emitted).toContain(`data: {"text":"Hello world","done":false}\n`);
      expect(emitted.endsWith("\n\n")).toBe(true);
    });

    it("should pass through already-formatted strings without double-encoding", async () => {
      const context = buildContext("text/event-stream");
      const rawString = "data: already formatted\n\n";
      const handler = buildCallHandler(rawString);

      const result$ = interceptor.intercept(context, handler);
      const emitted = await firstValueFrom(result$);

      expect(emitted).toBe(rawString);
    });

    it("should handle a done event correctly", async () => {
      const context = buildContext("text/event-stream");
      const event = StreamEventDto.done("final-id");
      const handler = buildCallHandler(event);

      const result$ = interceptor.intercept(context, handler);
      const emitted = await firstValueFrom(result$);

      expect(emitted).toContain("event: done\n");
      expect(emitted).toContain(`data: {"done":true}\n`);
    });

    it("should handle an error event correctly", async () => {
      const context = buildContext("text/event-stream");
      const event = StreamEventDto.error("AI failure", "AI_TIMEOUT");
      const handler = buildCallHandler(event);

      const result$ = interceptor.intercept(context, handler);
      const emitted = await firstValueFrom(result$);

      expect(emitted).toContain("event: error\n");
      expect(emitted).toContain("AI_TIMEOUT");
    });
  });
});
