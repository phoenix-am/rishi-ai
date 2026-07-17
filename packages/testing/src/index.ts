/**
 * Shared Vitest assertions and path resolution helpers
 */

import { expect } from "vitest";

export function assertThrowsAsync(fn: () => Promise<any>, errorConstructor: any): Promise<void> {
  return expect(fn()).rejects.toThrow(errorConstructor);
}
