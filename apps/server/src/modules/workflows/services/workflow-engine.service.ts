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

@Injectable()
export class WorkflowEngineService implements IWorkflowEngine {
  constructor(
    @Inject(WORKFLOW_REPOSITORY) private readonly workflowRepo: IWorkflowRepository,
    @Inject(WORKFLOW_RUN_REPOSITORY) private readonly workflowRunRepo: IWorkflowRunRepository,
    @Inject("ILLMProvider") private readonly llmProvider: ILLMProvider,
    @Inject("ITTSProvider") private readonly ttsProvider: ITTSProvider,
    @Inject("ILogger") private readonly logger: ILogger,
    private readonly eventEmitter: EventEmitter2
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
