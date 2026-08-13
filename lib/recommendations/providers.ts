import "server-only";
import { projectBlueprintJsonSchema, projectBlueprintSchema, type BlueprintInput, type ProjectBlueprint } from "./blueprint-schema";

export type BlueprintProviderName = "openai" | "gemini";
export interface ProjectBlueprintProvider {
  readonly name: BlueprintProviderName;
  readonly model: string;
  readonly embeddingModel: string;
  generate(input: BlueprintInput): Promise<ProjectBlueprint>;
  embed(input: string): Promise<number[]>;
}

const systemPrompt = `You design lean, viable project teams for n2. Identify what the owner already contributes before suggesting gaps. Put only essential roles in now, coordination roles in next, and launch or scale roles in later. Return the supplied JSON schema exactly. Never infer or request personal identity data. AI designs abstract roles only and must never select named people.`;

function userPrompt(input: BlueprintInput) {
  return `Build a phased project team blueprint from this privacy-filtered input:\n${JSON.stringify(input)}`;
}

function parseOpenAIText(payload: unknown) {
  const data = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (data.output_text) return data.output_text;
  return data.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text;
}

class OpenAIProvider implements ProjectBlueprintProvider {
  readonly name = "openai" as const;
  readonly model: string;
  readonly embeddingModel: string;
  constructor(private apiKey: string, model?: string, embeddingModel?: string) {
    this.model = model || process.env.OPENAI_BLUEPRINT_MODEL || "gpt-4.1-mini";
    this.embeddingModel = embeddingModel || process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  }
  async generate(input: BlueprintInput) {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({
      model: this.model,
      input: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt(input) }],
      text: { format: { type: "json_schema", name: "n2_project_blueprint", strict: true, schema: projectBlueprintJsonSchema } },
    }), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`OpenAI blueprint request failed (${response.status})`);
    const text = parseOpenAIText(await response.json());
    if (!text) throw new Error("OpenAI returned no structured blueprint");
    return projectBlueprintSchema.parse(JSON.parse(text));
  }
  async embed(input: string) {
    const response = await fetch("https://api.openai.com/v1/embeddings", { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: this.embeddingModel, input, dimensions: 768 }), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`OpenAI embedding request failed (${response.status})`);
    const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
    if (payload.data?.[0]?.embedding?.length !== 768) throw new Error("OpenAI returned an invalid embedding");
    return payload.data[0].embedding!;
  }
}

class GeminiProvider implements ProjectBlueprintProvider {
  readonly name = "gemini" as const;
  readonly model: string;
  readonly embeddingModel: string;
  constructor(private apiKey: string, model?: string, embeddingModel?: string) {
    this.model = model || process.env.GEMINI_BLUEPRINT_MODEL || "gemini-2.5-flash";
    this.embeddingModel = embeddingModel || process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
  }
  async generate(input: BlueprintInput) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userPrompt(input) }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: projectBlueprintJsonSchema },
    }), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Gemini blueprint request failed (${response.status})`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.find(part => part.text)?.text;
    if (!text) throw new Error("Gemini returned no structured blueprint");
    return projectBlueprintSchema.parse(JSON.parse(text));
  }
  async embed(input: string) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.embeddingModel)}:embedContent?key=${encodeURIComponent(this.apiKey)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: { parts: [{ text: input }] }, outputDimensionality: 768 }), signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Gemini embedding request failed (${response.status})`);
    const payload = await response.json() as { embedding?: { values?: number[] } };
    if (payload.embedding?.values?.length !== 768) throw new Error("Gemini returned an invalid embedding");
    return payload.embedding.values;
  }
}

export function createBlueprintProvider(input: { provider: string; blueprintModel: string; embeddingModel: string }) {
  if (input.provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) throw new Error("Gemini is selected but GEMINI_API_KEY is not configured");
    return new GeminiProvider(process.env.GEMINI_API_KEY, input.blueprintModel, input.embeddingModel);
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI is selected but OPENAI_API_KEY is not configured");
  return new OpenAIProvider(process.env.OPENAI_API_KEY, input.blueprintModel, input.embeddingModel);
}

export async function withOneRetry<T>(operation: () => Promise<T>) {
  try { return await operation(); } catch (firstError) {
    try { return await operation(); } catch { throw firstError; }
  }
}
