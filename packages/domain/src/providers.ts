export interface ILLMProvider {
  generateText(prompt: string, systemInstructions?: string): Promise<string>;
}

export interface ITTSProvider {
  generateAudio(text: string): Promise<Buffer>;
}
