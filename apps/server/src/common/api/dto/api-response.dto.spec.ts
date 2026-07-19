import { describe, it, expect } from "vitest";
import { ApiResponseDto, PaginatedResponseDto } from "./api-response.dto.js";

describe("ApiResponseDto", () => {
  describe("constructor", () => {
    it("should set success=true, data, meta, and error=null", () => {
      const dto = new ApiResponseDto({ id: "abc" }, { correlationId: "cid-1" });

      expect(dto.success).toBe(true);
      expect(dto.data).toEqual({ id: "abc" });
      expect(dto.meta).toEqual({ correlationId: "cid-1" });
      expect(dto.error).toBeNull();
    });

    it("should default meta to empty object when not provided", () => {
      const dto = new ApiResponseDto(42);

      expect(dto.meta).toEqual({});
    });
  });

  describe("static of()", () => {
    it("should return an ApiResponseDto instance with the given data", () => {
      const dto = ApiResponseDto.of("hello");

      expect(dto).toBeInstanceOf(ApiResponseDto);
      expect(dto.data).toBe("hello");
      expect(dto.success).toBe(true);
    });

    it("should forward optional meta", () => {
      const dto = ApiResponseDto.of(null, { version: "v1" });

      expect(dto.meta).toEqual({ version: "v1" });
    });
  });

  describe("shape invariants", () => {
    it("should always have error=null on a success DTO", () => {
      const dto = ApiResponseDto.of({ x: 1 });

      expect(dto.error).toBeNull();
    });
  });
});

describe("PaginatedResponseDto", () => {
  const sampleItems = [{ id: "1" }, { id: "2" }];

  describe("static paginate()", () => {
    it("should compute totalPages correctly", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(dto.meta.totalPages).toBe(3);
    });

    it("should set hasNextPage=true when more pages exist", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(dto.meta.hasNextPage).toBe(true);
    });

    it("should set hasNextPage=false on the last page", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 3,
        limit: 10,
        total: 25,
      });

      expect(dto.meta.hasNextPage).toBe(false);
    });

    it("should set hasPrevPage=false on the first page", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 1,
        limit: 10,
        total: 25,
      });

      expect(dto.meta.hasPrevPage).toBe(false);
    });

    it("should set hasPrevPage=true beyond the first page", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 2,
        limit: 10,
        total: 25,
      });

      expect(dto.meta.hasPrevPage).toBe(true);
    });

    it("should return totalPages=1 when total is 0 (guard against division-by-zero)", () => {
      const dto = PaginatedResponseDto.paginate([], {
        page: 1,
        limit: 10,
        total: 0,
      });

      expect(dto.meta.totalPages).toBe(1);
    });

    it("should embed items in the data field", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 1,
        limit: 10,
        total: 2,
      });

      expect(dto.data).toEqual(sampleItems);
    });

    it("should have success=true", () => {
      const dto = PaginatedResponseDto.paginate(sampleItems, {
        page: 1,
        limit: 10,
        total: 2,
      });

      expect(dto.success).toBe(true);
    });

    it("should merge additionalMeta into the meta object", () => {
      const dto = PaginatedResponseDto.paginate(
        sampleItems,
        { page: 1, limit: 5, total: 5 },
        { requestId: "xyz" }
      );

      expect(dto.meta).toMatchObject({ requestId: "xyz", page: 1, limit: 5, total: 5 });
    });
  });
});
