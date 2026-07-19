import { Injectable, Inject } from "@nestjs/common";
import * as googleTTS from "google-tts-api";
import type { ILogger } from "@rishi/logger";
import { ITTSProvider } from "@rishi/domain";

@Injectable()
export class FreeGoogleTtsAdapter implements ITTSProvider {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  async generateAudio(text: string): Promise<Buffer> {
    this.logger.info("Generating audio using FreeGoogleTtsAdapter");
    try {
      // The free google-tts-api has a 200 character limit per request.
      // We will use getAllAudioBase64 which handles chunks up to 200 chars.
      const results = await googleTTS.getAllAudioBase64(text, {
        lang: "en",
        slow: false,
        host: "https://translate.google.com",
        splitPunct: ",.?",
      });

      // results is an array of objects: { shortText: string, base64: string }
      // We need to decode the base64 strings and concatenate the buffers.
      const buffers = results.map((result) => Buffer.from(result.base64, "base64"));
      const combinedBuffer = Buffer.concat(buffers);

      return combinedBuffer;
    } catch (error) {
      this.logger.error("Error generating audio with Free Google TTS", error as Error);
      throw new Error("Failed to generate audio using Free Google TTS Provider.");
    }
  }
}
