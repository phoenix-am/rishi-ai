import { Injectable, Inject } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConfigService } from "@rishi/config";
import type { ILogger } from "@rishi/logger";
import { ILLMProvider } from "@rishi/domain";

@Injectable()
export class GeminiAdapter implements ILLMProvider {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = "gemini-2.5-flash"; // Free tier model

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {
    // If not in env, we can fallback or throw. Assuming it's in env for this project.
    const apiKey = this.configService.get("GEMINI_API_KEY") || "";
    if (!apiKey) {
      this.logger.warn("GEMINI_API_KEY is not set. LLM provider will fail on execution.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateText(prompt: string, systemInstructions?: string): Promise<string> {
    this.logger.info(`Generating text using Gemini model: ${this.modelName}`);

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemInstructions,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      this.logger.error("Error generating text with Gemini API", error as Error);
      throw new Error("Failed to generate text using Gemini Provider.");
    }
  }
}
