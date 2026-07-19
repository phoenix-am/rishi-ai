import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Creator, CREATOR_REPOSITORY } from "@rishi/domain";
import type { ICreatorRepository } from "@rishi/domain";
import { DatabaseService, creators, CreatorMapper } from "@rishi/database";
import { TransactionManager } from "@rishi/transaction";
import { CreateCreatorDto } from "../dto/create-creator.dto.js";
import { UpdateCreatorDto } from "../dto/update-creator.dto.js";
import { CreatorResponseDto } from "../dto/creator-response.dto.js";
import { PaginationQueryDto } from "../../../common/pagination/dto/pagination-query.dto.js";
import { PaginatedResponseDto } from "../../../common/api/dto/api-response.dto.js";
import { eq, sql, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

@Injectable()
export class CreatorsApplicationService {
  constructor(
    @Inject(CREATOR_REPOSITORY) private readonly creatorRepo: ICreatorRepository,
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(TransactionManager) private readonly txManager: TransactionManager,
    @Inject("DRIZZLE_CLIENT") private readonly drizzleClient: any
  ) {}

  /**
   * Creates a new creator profile in the active workspace.
   */
  public async create(workspaceId: string, dto: CreateCreatorDto): Promise<CreatorResponseDto> {
    const handleLower = dto.handle.trim().toLowerCase();

    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      // Check handle uniqueness globally
      const existing = await this.creatorRepo.findByHandle(handleLower);
      if (existing) {
        throw new ConflictException(`Handle '${dto.handle}' is already in use.`);
      }

      const creator = new Creator(
        randomUUID(),
        workspaceId,
        dto.name,
        handleLower,
        dto.bio || null,
        dto.avatarUrl || null,
        new Date()
      );

      await this.creatorRepo.save(creator);

      return CreatorResponseDto.fromDomain(creator);
    });
  }

  /**
   * Updates an existing creator profile in the active workspace.
   */
  public async update(
    workspaceId: string,
    id: string,
    dto: UpdateCreatorDto
  ): Promise<CreatorResponseDto> {
    return this.txManager.runInTransaction(this.drizzleClient.db, async () => {
      const creator = await this.creatorRepo.findById(id);
      if (!creator) {
        throw new NotFoundException(`Creator with ID '${id}' was not found.`);
      }

      // Enforce tenancy isolation
      if (creator.workspaceId !== workspaceId) {
        throw new ForbiddenException("Access Denied: You do not own this creator profile.");
      }

      let updatedHandle = creator.handle;
      if (dto.handle !== undefined) {
        const handleLower = dto.handle.trim().toLowerCase();
        if (handleLower !== creator.handle) {
          const existing = await this.creatorRepo.findByHandle(handleLower);
          if (existing && existing.id !== id) {
            throw new ConflictException(`Handle '${dto.handle}' is already in use.`);
          }
          updatedHandle = handleLower;
        }
      }

      const updatedCreator = new Creator(
        creator.id,
        creator.workspaceId,
        dto.name !== undefined ? dto.name : creator.name,
        updatedHandle,
        dto.bio !== undefined ? dto.bio : creator.bio,
        dto.avatarUrl !== undefined ? dto.avatarUrl : creator.avatarUrl,
        creator.createdAt
      );

      await this.creatorRepo.save(updatedCreator);

      return CreatorResponseDto.fromDomain(updatedCreator);
    });
  }

  /**
   * Retrieves a creator profile by ID, enforcing tenancy constraints.
   */
  public async getById(workspaceId: string, id: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepo.findById(id);
    if (!creator) {
      throw new NotFoundException(`Creator with ID '${id}' was not found.`);
    }

    if (creator.workspaceId !== workspaceId) {
      throw new ForbiddenException("Access Denied: You do not own this creator profile.");
    }

    return CreatorResponseDto.fromDomain(creator);
  }

  /**
   * Lists creator profiles paginated and filtered by workspace.
   */
  public async list(
    workspaceId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CreatorResponseDto>> {
    const filter = eq(creators.workspaceId, workspaceId);

    // 1. Fetch total count
    const countResult = await this.dbService.client
      .select({ count: sql<number>`count(*)` })
      .from(creators)
      .where(filter);

    const total = Number(countResult[0]?.count || 0);

    // 2. Determine sorting
    let orderByField: any = creators.createdAt;
    if (query.sortBy === "name") {
      orderByField = creators.name;
    } else if (query.sortBy === "handle") {
      orderByField = creators.handle;
    }

    const sortDir = query.sortOrder === "desc" ? desc(orderByField) : asc(orderByField);
    const limit = query.limit;
    const offset = (query.page - 1) * limit;

    // 3. Fetch rows
    const rows = await this.dbService.client
      .select()
      .from(creators)
      .where(filter)
      .orderBy(sortDir)
      .limit(limit)
      .offset(offset);

    const items = rows.map((row) => CreatorResponseDto.fromDomain(CreatorMapper.toDomain(row)));

    return PaginatedResponseDto.paginate(items, {
      page: query.page,
      limit: query.limit,
      total,
    });
  }
}
