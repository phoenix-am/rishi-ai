import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { PaginationTransformPipe } from "./pagination-transform.pipe.js";

describe("PaginationTransformPipe", () => {
  const pipe = new PaginationTransformPipe();

  describe("defaults", () => {
    it("should apply page=1 and limit=20 when no query params are provided", async () => {
      const result = await pipe.transform({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should apply sortOrder='asc' when not specified", async () => {
      const result = await pipe.transform({});

      expect(result.sortOrder).toBe("asc");
    });

    it("should leave sortBy undefined when not provided", async () => {
      const result = await pipe.transform({});

      expect(result.sortBy).toBeUndefined();
    });
  });

  describe("type coercion (string → number)", () => {
    it("should coerce string '3' to number page=3", async () => {
      const result = await pipe.transform({ page: "3" });

      expect(result.page).toBe(3);
    });

    it("should coerce string '50' to number limit=50", async () => {
      const result = await pipe.transform({ limit: "50" });

      expect(result.limit).toBe(50);
    });
  });

  describe("valid inputs", () => {
    it("should accept valid page and limit", async () => {
      const result = await pipe.transform({ page: "2", limit: "10" });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it("should accept sortBy and sortOrder=desc", async () => {
      const result = await pipe.transform({ sortBy: "createdAt", sortOrder: "desc" });

      expect(result.sortBy).toBe("createdAt");
      expect(result.sortOrder).toBe("desc");
    });

    it("should accept sortOrder=asc explicitly", async () => {
      const result = await pipe.transform({ sortOrder: "asc" });

      expect(result.sortOrder).toBe("asc");
    });
  });

  describe("constraint violations", () => {
    it("should throw BadRequestException when page < 1", async () => {
      await expect(pipe.transform({ page: "0" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when limit < 1", async () => {
      await expect(pipe.transform({ limit: "0" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when limit > 100", async () => {
      await expect(pipe.transform({ limit: "101" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when sortOrder is an invalid value", async () => {
      await expect(pipe.transform({ sortOrder: "INVALID" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when page is a float", async () => {
      await expect(pipe.transform({ page: "1.5" })).rejects.toThrow(BadRequestException);
    });
  });

  describe("edge cases", () => {
    it("should handle null input gracefully and apply defaults", async () => {
      const result = await pipe.transform(null);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("should strip extra unknown properties", async () => {
      const result = (await pipe.transform({ page: "1", unknownField: "xyz" })) as any;

      expect(result.unknownField).toBeUndefined();
    });
  });
});
