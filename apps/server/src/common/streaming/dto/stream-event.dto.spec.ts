import { describe, it, expect } from "vitest";
import { StreamEventDto } from "./stream-event.dto.js";

describe("StreamEventDto", () => {
  describe("constructor", () => {
    it("should set all provided fields", () => {
      const event = new StreamEventDto({
        data: '{"text":"Hello"}',
        id: "evt-1",
        event: "chunk",
        retry: 3000,
      });

      expect(event.data).toBe('{"text":"Hello"}');
      expect(event.id).toBe("evt-1");
      expect(event.event).toBe("chunk");
      expect(event.retry).toBe(3000);
    });

    it("should allow omitting optional fields", () => {
      const event = new StreamEventDto({ data: "ping" });

      expect(event.data).toBe("ping");
      expect(event.id).toBeUndefined();
      expect(event.event).toBeUndefined();
      expect(event.retry).toBeUndefined();
    });
  });

  describe("static factory: chunk()", () => {
    it("should create an event with type 'chunk' and done=false", () => {
      const event = StreamEventDto.chunk("Hello, AI!");

      expect(event.event).toBe("chunk");
      const parsed = JSON.parse(event.data);
      expect(parsed.text).toBe("Hello, AI!");
      expect(parsed.done).toBe(false);
    });

    it("should forward an optional id", () => {
      const event = StreamEventDto.chunk("text", "id-42");

      expect(event.id).toBe("id-42");
    });
  });

  describe("static factory: done()", () => {
    it("should create an event with type 'done' and done=true", () => {
      const event = StreamEventDto.done();

      expect(event.event).toBe("done");
      const parsed = JSON.parse(event.data);
      expect(parsed.done).toBe(true);
    });
  });

  describe("static factory: error()", () => {
    it("should create an event with type 'error' and default code STREAM_ERROR", () => {
      const event = StreamEventDto.error("Something broke");

      expect(event.event).toBe("error");
      const parsed = JSON.parse(event.data);
      expect(parsed.error.code).toBe("STREAM_ERROR");
      expect(parsed.error.message).toBe("Something broke");
    });

    it("should accept a custom error code", () => {
      const event = StreamEventDto.error("Quota exceeded", "QUOTA_EXCEEDED");

      const parsed = JSON.parse(event.data);
      expect(parsed.error.code).toBe("QUOTA_EXCEEDED");
    });
  });

  describe("toWireFormat()", () => {
    it("should produce a string ending with double newline (event separator)", () => {
      const event = new StreamEventDto({ data: "ping" });
      const wire = event.toWireFormat();

      expect(wire.endsWith("\n\n")).toBe(true);
    });

    it("should include id: line when id is set", () => {
      const event = new StreamEventDto({ data: "x", id: "123" });
      const wire = event.toWireFormat();

      expect(wire).toContain("id: 123\n");
    });

    it("should include event: line when event is set", () => {
      const event = new StreamEventDto({ data: "x", event: "chunk" });
      const wire = event.toWireFormat();

      expect(wire).toContain("event: chunk\n");
    });

    it("should include retry: line when retry is set", () => {
      const event = new StreamEventDto({ data: "x", retry: 5000 });
      const wire = event.toWireFormat();

      expect(wire).toContain("retry: 5000\n");
    });

    it("should include data: line for each data line (multi-line support)", () => {
      const event = new StreamEventDto({ data: "line1\nline2" });
      const wire = event.toWireFormat();

      expect(wire).toContain("data: line1\n");
      expect(wire).toContain("data: line2\n");
    });

    it("should NOT include id: line when id is not set", () => {
      const event = new StreamEventDto({ data: "ping" });
      const wire = event.toWireFormat();

      expect(wire).not.toContain("id:");
    });

    it("should NOT include event: line when event is not set", () => {
      const event = new StreamEventDto({ data: "ping" });
      const wire = event.toWireFormat();

      expect(wire).not.toContain("event:");
    });

    it("should produce a valid W3C SSE field order (id → event → retry → data)", () => {
      const event = new StreamEventDto({
        data: "payload",
        id: "1",
        event: "message",
        retry: 1000,
      });
      const wire = event.toWireFormat();

      const idPos = wire.indexOf("id:");
      const eventPos = wire.indexOf("event:");
      const retryPos = wire.indexOf("retry:");
      const dataPos = wire.indexOf("data:");

      expect(idPos).toBeLessThan(eventPos);
      expect(eventPos).toBeLessThan(retryPos);
      expect(retryPos).toBeLessThan(dataPos);
    });

    it("should produce correct wire format for a chunk factory event", () => {
      const event = StreamEventDto.chunk("Hello", "evt-1");
      const wire = event.toWireFormat();

      expect(wire).toContain("id: evt-1\n");
      expect(wire).toContain("event: chunk\n");
      expect(wire).toContain(`data: {"text":"Hello","done":false}\n`);
    });
  });
});
