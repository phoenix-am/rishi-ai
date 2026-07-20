import { Injectable, Inject } from "@nestjs/common";
import type { ILogger } from "@rishi/logger";
import { WORKFLOW_REPOSITORY, WORKFLOW_RUN_REPOSITORY, WorkflowNodeType } from "@rishi/domain";
import type {
  IWorkflowEngine,
  IWorkflowRun,
  IWorkflowRepository,
  IWorkflowRunRepository,
  ILLMProvider,
  ITTSProvider,
} from "@rishi/domain";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { ContentAssetsApplicationService } from "../../content-assets/services/content-assets-application.service.js";
import { CreateContentAssetDto } from "../../content-assets/dto/create-content-asset.dto.js";

@Injectable()
export class WorkflowEngineService implements IWorkflowEngine {
  constructor(
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepo: IWorkflowRepository,
    @Inject(WORKFLOW_RUN_REPOSITORY) private readonly workflowRunRepo: IWorkflowRunRepository,
    @Inject("ILLMProvider") private readonly llmProvider: ILLMProvider,
    @Inject("ITTSProvider") private readonly ttsProvider: ITTSProvider,
    @Inject("ILogger") private readonly logger: ILogger,
    private readonly eventEmitter: EventEmitter2,
    private readonly contentAssetsService: ContentAssetsApplicationService
  ) {}

  async execute(run: IWorkflowRun): Promise<void> {
    this.logger.info(`Starting execution of workflow run: ${run.id}`);

    // Fetch workflow definition
    const workflow = await this.workflowRepo.findById(run.workflowId);
    if (!workflow) {
      const errorMsg = `Workflow ${run.workflowId} not found for run ${run.id}`;
      this.logger.error(errorMsg);
      // Ideally transition the run state to failed
      (run as any).fail({ error: errorMsg });
      await this.workflowRunRepo.save(run as any);
      return;
    }

    try {
      (run as any).start();
      await this.workflowRunRepo.save(run as any);

      this.eventEmitter.emit(`workflow.run.${run.id}`, {
        type: "RUN_STARTED",
        runId: run.id,
        timestamp: new Date().toISOString(),
      });

      const nodes = workflow.definition.nodes;
      const edges = workflow.definition.edges;

      // Simple sequential topological execution for now.
      // Assumes nodes are arranged sequentially or DAG is executed via BFS.
      // In a more complex engine, we'd use a proper task queue/graph execution logic.
      // For this phase, we'll iterate through nodes and follow edges to process sequentially.

      // Find starting nodes (nodes with no incoming edges)
      const incomingEdgesCount = new Map<string, number>();
      nodes.forEach((n) => incomingEdgesCount.set(n.id, 0));
      edges.forEach((e) => {
        incomingEdgesCount.set(e.to, (incomingEdgesCount.get(e.to) || 0) + 1);
      });

      const queue: string[] = nodes
        .filter((n) => incomingEdgesCount.get(n.id) === 0)
        .map((n) => n.id);

      // Track the last executed node for asset extraction
      let lastExecutedNode: any = null;

      // For a linear workflow we just iterate. Since DAG is simple:
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = nodes.find((n) => n.id === nodeId)!;

        this.logger.info(`Executing node ${node.name} (${node.type})`);

        this.eventEmitter.emit(`workflow.run.${run.id}`, {
          type: "NODE_STARTED",
          runId: run.id,
          nodeId: node.id,
          timestamp: new Date().toISOString(),
        });

        // Execute Node
        await this.executeNode(node, run);

        this.eventEmitter.emit(`workflow.run.${run.id}`, {
          type: "NODE_COMPLETED",
          runId: run.id,
          nodeId: node.id,
          data: run.state.outputs[node.id],
          timestamp: new Date().toISOString(),
        });

        lastExecutedNode = node;

        // Find next nodes
        const nextEdges = edges.filter((e) => e.from === nodeId);
        for (const edge of nextEdges) {
          const count = incomingEdgesCount.get(edge.to)! - 1;
          incomingEdgesCount.set(edge.to, count);
          if (count === 0) {
            queue.push(edge.to);
          }
        }
      }

      this.logger.info(`Workflow run ${run.id} completed successfully`);
      (run as any).complete(run.state.outputs || {});
      await this.workflowRunRepo.save(run as any);

      // Auto-create content asset if a projectId is associated with this run
      if (run.projectId && lastExecutedNode) {
        await this.saveOutputAsContentAsset(run, lastExecutedNode);
      }

      this.eventEmitter.emit(`workflow.run.${run.id}`, {
        type: "RUN_COMPLETED",
        runId: run.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error executing workflow run ${run.id}`, error as Error);
      (run as any).fail({ error: (error as Error).message });
      await this.workflowRunRepo.save(run as any);

      this.eventEmitter.emit(`workflow.run.${run.id}`, {
        type: "RUN_FAILED",
        runId: run.id,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Extracts the generated content from the final node output and persists it
   * as a ContentAsset within the linked project.
   *
   * Uses run.workspaceId as the tenant context (Security Audit C) since the
   * engine executes in a background context without an HTTP request.
   */
  private async saveOutputAsContentAsset(run: IWorkflowRun, lastNode: any): Promise<void> {
    try {
      const nodeOutput = run.state.outputs[lastNode.id];
      if (!nodeOutput) {
        this.logger.warn(
          `No output found for final node ${lastNode.id} in run ${run.id}; skipping asset creation.`
        );
        return;
      }

      let assetDto: CreateContentAssetDto | null = null;

      if (lastNode.type === WorkflowNodeType.LLM_PROMPT && nodeOutput.text) {
        assetDto = {
          projectId: run.projectId!,
          type: "SCRIPT" as any,
          textContent: nodeOutput.text,
        };
      } else if (lastNode.type === WorkflowNodeType.TEXT_TO_SPEECH && nodeOutput.audio) {
        // For audio, store the buffer as a base64 data URL for MVP.
        // In production, this would be uploaded to object storage.
        const audioDataUrl =
          typeof nodeOutput.audio === "string"
            ? nodeOutput.audio
            : `data:audio/mp3;base64,${Buffer.from(nodeOutput.audio).toString("base64")}`;

        assetDto = {
          projectId: run.projectId!,
          type: "AUDIO" as any,
          contentUrl: audioDataUrl,
        };
      }

      if (assetDto) {
        // Use run.workspaceId as tenant context (background execution — no HTTP context)
        await this.contentAssetsService.create(run.workspaceId, assetDto);
        this.logger.info(
          `Auto-created ${assetDto.type} content asset for project ${run.projectId} from run ${run.id}`
        );
      } else {
        this.logger.warn(
          `Could not extract content asset from final node ${lastNode.id} (type: ${lastNode.type}) in run ${run.id}`
        );
      }
    } catch (error) {
      // Asset creation failure should not fail the workflow run itself
      this.logger.error(
        `Failed to auto-create content asset for run ${run.id}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private async executeNode(node: any, run: IWorkflowRun): Promise<void> {
    const config = node.config || {};
    const state = run.state;

    // Resolve inputs mapping if needed (simplified for this phase)
    // Assume state has a global context object for inputs/outputs

    switch (node.type) {
      case WorkflowNodeType.LLM_PROMPT: {
        const prompt = config.prompt || state.inputs.prompt;
        const sysInstructions = config.systemInstructions;
        if (!prompt) throw new Error(`Node ${node.id} missing prompt input`);

        const output = await this.llmProvider.generateText(prompt, sysInstructions);
        state.outputs[node.id] = { text: output };
        break;
      }

      case WorkflowNodeType.TEXT_TO_SPEECH: {
        // e.g. text can come from config or previous node output
        const text =
          config.text ||
          (config.inputNodeId ? state.outputs[config.inputNodeId]?.text : state.inputs.text);
        if (!text) throw new Error(`Node ${node.id} missing text input`);

        const audioBuffer = await this.ttsProvider.generateAudio(text);
        // Storing buffer in state might be heavy in production, but okay for MVP memory execution
        state.outputs[node.id] = { audio: audioBuffer };
        break;
      }

      case WorkflowNodeType.MERGE_VIDEO: {
        this.logger.warn("MERGE_VIDEO node type not implemented yet");
        // Phase 7/8 scope
        break;
      }

      default:
        this.logger.warn(`Unknown node type: ${node.type}`);
        break;
    }
  }
}
