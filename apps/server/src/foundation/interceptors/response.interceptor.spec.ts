import { describe, it, expect } from "vitest";
import { ExecutionContext, CallHandler } from "@nestjs/common";
import { of } from "rxjs";
import { ResponseEnvelopeInterceptor } from "./response.interceptor.js";

describe("ResponseEnvelopeInterceptor", () => {
  it("should wrap a standard success response payload in the response envelope", async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const contextMock = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({ getHeader: () => undefined }),
      }),
    } as unknown as ExecutionContext;

    const handlerMock = {
      handle: () => of({ title: "Sanatan Dharma History Outline" }),
    } as CallHandler;

    const observable = interceptor.intercept(contextMock, handlerMock);
    observable.subscribe((result) => {
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ title: "Sanatan Dharma History Outline" });
      expect(result.error).toBeNull();
      expect(result.meta).toBeDefined();
    });
  });

  it("should bypass wrapping when the response is already in enveloped format", async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const contextMock = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({ getHeader: () => undefined }),
      }),
    } as unknown as ExecutionContext;

    const alreadyEnveloped = {
      success: true,
      data: { status: "UP" },
      meta: { correlationId: "trace-111" },
      error: null,
    };

    const handlerMock = {
      handle: () => of(alreadyEnveloped),
    } as CallHandler;

    const observable = interceptor.intercept(contextMock, handlerMock);
    observable.subscribe((result) => {
      expect(result).toBe(alreadyEnveloped);
    });
  });

  it("should bypass wrapping for Server-Sent Events (SSE) based on headers", async () => {
    const interceptor = new ResponseEnvelopeInterceptor();
    const contextMock = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { accept: "text/event-stream" } }),
        getResponse: () => ({ getHeader: () => undefined }),
      }),
    } as unknown as ExecutionContext;

    const messageEvent = { event: "message", data: "Rigveda translation text token..." };
    const handlerMock = {
      handle: () => of(messageEvent),
    } as CallHandler;

    const observable = interceptor.intercept(contextMock, handlerMock);
    observable.subscribe((result) => {
      expect(result).toBe(messageEvent);
    });
  });
});
