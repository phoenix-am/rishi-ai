import { describe, it, expect } from "vitest";
import { RequestContext } from "./request.context.js";

describe("RequestContext (AsyncLocalStorage)", () => {
  it("should return undefined correlation ID when outside of a context", () => {
    expect(RequestContext.getCorrelationId()).toBeUndefined();
  });

  it("should retrieve the active correlation ID when executing inside a context", () => {
    RequestContext.run({ correlationId: "test-correlation-1" }, () => {
      expect(RequestContext.getCorrelationId()).toBe("test-correlation-1");
    });
    expect(RequestContext.getCorrelationId()).toBeUndefined();
  });

  it("should maintain strict correlation ID isolation across concurrent executions (Concurrency Isolation)", async () => {
    const runInContext = async (id: string, delayMs: number) => {
      return RequestContext.run({ correlationId: id }, async () => {
        // Assert initial context setup
        expect(RequestContext.getCorrelationId()).toBe(id);

        // Sleep to allow concurrent promises to overlap in the event loop
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Assert context state remains isolated and unchanged after sleeping
        expect(RequestContext.getCorrelationId()).toBe(id);
        return RequestContext.getCorrelationId();
      });
    };

    // Trigger three concurrent promises with different delay timings and IDs
    const results = await Promise.all([
      runInContext("thread-a", 30),
      runInContext("thread-b", 10),
      runInContext("thread-c", 20),
    ]);

    expect(results[0]).toBe("thread-a");
    expect(results[1]).toBe("thread-b");
    expect(results[2]).toBe("thread-c");
  });
});
