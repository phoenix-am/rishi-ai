import { Module } from "@nestjs/common";
import { GeminiAdapter } from "./gemini.adapter.js";
import { FreeGoogleTtsAdapter } from "./google-tts.adapter.js";

@Module({
  providers: [
    {
      provide: "ILLMProvider",
      useClass: GeminiAdapter,
    },
    {
      provide: "ITTSProvider",
      useClass: FreeGoogleTtsAdapter,
    },
  ],
  exports: ["ILLMProvider", "ITTSProvider"],
})
export class AiModule {}
