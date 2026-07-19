import { describe, it, expect, vi, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { CreatorsApplicationService } from "./creators-application.service.js";
import { Creator, CREATOR_REPOSITORY } from "@rishi/domain";
import { DatabaseService } from "@rishi/database";
import { TransactionManager } from "@rishi/transaction";
import { ConflictException, NotFoundException, ForbiddenException } from "@nestjs/common";

describe("CreatorsApplicationService", () => {
  let service: CreatorsApplicationService;
  let mockCreatorRepo: any;
  let mockDbService: any;
  let mockTxManager: any;
  let mockDrizzleClient: any;

  beforeEach(async () => {
    mockCreatorRepo = {
      findById: vi.fn(),
      findByHandle: vi.fn(),
      save: vi.fn(),
      exists: vi.fn(),
    };

    mockTxManager = {
      runInTransaction: vi.fn((_db, cb) => cb()),
    };

    const mockSelectBuilder: any = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };

    mockDbService = {
      client: {
        select: vi.fn().mockReturnValue(mockSelectBuilder),
      },
    };

    mockDrizzleClient = {
      db: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorsApplicationService,
        { provide: CREATOR_REPOSITORY, useValue: mockCreatorRepo },
        { provide: DatabaseService, useValue: mockDbService },
        { provide: TransactionManager, useValue: mockTxManager },
        { provide: "DRIZZLE_CLIENT", useValue: mockDrizzleClient },
      ],
    }).compile();

    service = module.get<CreatorsApplicationService>(CreatorsApplicationService);
  });

  describe("create", () => {
    it("should successfully create a new creator profile", async () => {
      mockCreatorRepo.findByHandle.mockResolvedValue(null);

      const result = await service.create("w-1", {
        name: "Test Name",
        handle: "test_handle",
        bio: "bio details",
        avatarUrl: "https://avatar.png",
      });

      expect(result.name).toBe("Test Name");
      expect(result.handle).toBe("test_handle");
      expect(result.bio).toBe("bio details");
      expect(result.avatarUrl).toBe("https://avatar.png");
      expect(mockCreatorRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException if handle is already in use", async () => {
      mockCreatorRepo.findByHandle.mockResolvedValue(
        new Creator("c-existing", "w-1", "Existing", "test_handle")
      );

      await expect(
        service.create("w-1", {
          name: "Test Name",
          handle: "test_handle",
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("should successfully update creator properties", async () => {
      const existingCreator = new Creator("c-1", "w-1", "Old Name", "old_handle");
      mockCreatorRepo.findById.mockResolvedValue(existingCreator);
      mockCreatorRepo.findByHandle.mockResolvedValue(null);

      const result = await service.update("w-1", "c-1", {
        name: "New Name",
        handle: "new_handle",
      });

      expect(result.name).toBe("New Name");
      expect(result.handle).toBe("new_handle");
      expect(mockCreatorRepo.save).toHaveBeenCalled();
    });

    it("should throw ForbiddenException if creator belongs to a different workspace", async () => {
      const existingCreator = new Creator("c-1", "w-other", "Name", "handle");
      mockCreatorRepo.findById.mockResolvedValue(existingCreator);

      await expect(
        service.update("w-1", "c-1", {
          name: "New Name",
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if creator does not exist", async () => {
      mockCreatorRepo.findById.mockResolvedValue(null);

      await expect(
        service.update("w-1", "c-1", {
          name: "New Name",
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getById", () => {
    it("should successfully retrieve creator by ID", async () => {
      const creator = new Creator("c-1", "w-1", "Name", "handle");
      mockCreatorRepo.findById.mockResolvedValue(creator);

      const result = await service.getById("w-1", "c-1");

      expect(result.id).toBe("c-1");
      expect(result.name).toBe("Name");
    });

    it("should throw ForbiddenException if creator belongs to a different workspace", async () => {
      const creator = new Creator("c-1", "w-other", "Name", "handle");
      mockCreatorRepo.findById.mockResolvedValue(creator);

      await expect(service.getById("w-1", "c-1")).rejects.toThrow(ForbiddenException);
    });
  });
});
