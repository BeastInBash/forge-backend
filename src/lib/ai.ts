import { GoogleGenAI } from '@google/genai';
import { z, type ZodType } from 'zod';
import ApiError from '../common/libs/ApiError';
import { env } from './env';

/**
 * The one place the backend talks to an LLM. Features call `generateJson` with a prompt and a
 * Zod schema and never see which provider answered, so switching from Gemini to OpenAI is an
 * env change (`AI_PROVIDER`, `AI_MODEL`, the provider's key), not a code change.
 *
 * Adding a provider: write an `AiProvider` and register it in `providers`.
 */

export type AiProviderName = 'gemini' | 'openai';

export interface JsonRequest<T> {
    /** Rules for the model. Never put user input here. */
    system: string;
    /** The user's input, passed as data. */
    prompt: string;
    /** Shape of the answer: sent to the provider as JSON Schema, then used to validate it. */
    schema: ZodType<T>;
    /** Short identifier for the schema, e.g. `meal_nutrition` (OpenAI requires one). */
    schemaName: string;
    maxOutputTokens?: number;
    timeoutMs?: number;
}

export interface JsonResult<T> {
    data: T;
    provider: AiProviderName;
    model: string;
    usage: { inputTokens?: number; outputTokens?: number };
    latencyMs: number;
}

/** What a provider adapter does: send the request, return the raw JSON text. */
interface AiProvider {
    defaultModel?: string;
    apiKey: string | undefined;
    generate(args: {
        apiKey: string;
        model: string;
        system: string;
        prompt: string;
        jsonSchema: Record<string, unknown>;
        schemaName: string;
        maxOutputTokens: number;
        timeoutMs: number;
    }): Promise<{ text: string; inputTokens?: number; outputTokens?: number }>;
}

/** The model answered, but not with JSON matching the schema. Callers may retry once. */
export class AiOutputError extends Error {
    constructor(
        message: string,
        public readonly raw: string
    ) {
        super(message);
        this.name = 'AiOutputError';
    }
}

let geminiClient: GoogleGenAI | undefined;

/** Removes `key` from every level of a JSON Schema. */
const omitKeyword = (schema: unknown, key: string): unknown => {
    if (Array.isArray(schema)) return schema.map((item) => omitKeyword(item, key));
    if (!schema || typeof schema !== 'object') return schema;
    return Object.fromEntries(
        Object.entries(schema)
            .filter(([k]) => k !== key)
            .map(([k, value]) => [k, omitKeyword(value, key)])
    );
};

const gemini: AiProvider = {
    defaultModel: 'gemini-3.5-flash-lite',
    apiKey: env.GEMINI_API_KEY,
    async generate({ apiKey, model, system, prompt, jsonSchema, maxOutputTokens, timeoutMs }) {
        geminiClient ??= new GoogleGenAI({ apiKey });
        const response = await geminiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: system,
                responseMimeType: 'application/json',
                // Gemini answers 400 INVALID_ARGUMENT to `maxItems` on an array of objects (seen
                // with gemini-3.5-flash-lite); the Zod schema still enforces the limit
                responseJsonSchema: omitKeyword(jsonSchema, 'maxItems'),
                temperature: 0,
                maxOutputTokens,
                httpOptions: { timeout: timeoutMs }
            }
        });
        return {
            text: response.text ?? '',
            inputTokens: response.usageMetadata?.promptTokenCount,
            outputTokens: response.usageMetadata?.candidatesTokenCount
        };
    }
};

/**
 * Chat Completions over plain fetch, so trying OpenAI needs no extra dependency. `strict` is off
 * because strict mode rejects some JSON Schema keywords Zod emits (min/max); Zod still validates.
 * No `temperature`: OpenAI's reasoning models reject anything but the default.
 */
const openai: AiProvider = {
    apiKey: env.OPENAI_API_KEY,
    async generate(args) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${args.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: args.model,
                messages: [
                    { role: 'system', content: args.system },
                    { role: 'user', content: args.prompt }
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: { name: args.schemaName, schema: args.jsonSchema, strict: false }
                },
                max_completion_tokens: args.maxOutputTokens
            }),
            signal: AbortSignal.timeout(args.timeoutMs)
        });
        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const body = (await res.json()) as {
            choices?: { message?: { content?: string | null } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        return {
            text: body.choices?.[0]?.message?.content ?? '',
            inputTokens: body.usage?.prompt_tokens,
            outputTokens: body.usage?.completion_tokens
        };
    }
};

const providers: Record<AiProviderName, AiProvider> = { gemini, openai };

const toJsonSchema = (schema: ZodType): Record<string, unknown> => {
    // Providers don't want the `$schema` dialect marker
    const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema, { io: 'output' });
    return jsonSchema;
};

/**
 * Asks the configured provider for JSON matching `schema` and returns it validated.
 *
 * Throws `ApiError` 503 when the provider has no key or model, 502 when the call fails or times
 * out, and `AiOutputError` when the answer doesn't match the schema.
 */
export const generateJson = async <T>(request: JsonRequest<T>): Promise<JsonResult<T>> => {
    const name = env.AI_PROVIDER;
    const provider = providers[name];
    const model = env.AI_MODEL || provider.defaultModel;
    if (!provider.apiKey) {
        throw new ApiError(503, `AI is not configured (${name.toUpperCase()}_API_KEY is missing)`);
    }
    if (!model) throw new ApiError(503, `AI is not configured (set AI_MODEL for ${name})`);

    const started = performance.now();
    let output: Awaited<ReturnType<AiProvider['generate']>>;
    try {
        output = await provider.generate({
            apiKey: provider.apiKey,
            model,
            system: request.system,
            prompt: request.prompt,
            jsonSchema: toJsonSchema(request.schema),
            schemaName: request.schemaName,
            maxOutputTokens: request.maxOutputTokens ?? 4096,
            timeoutMs: request.timeoutMs ?? 15_000
        });
    } catch (error) {
        console.error({ ai: name, model, error: error instanceof Error ? error.message : error });
        throw new ApiError(502, 'The AI service failed to respond; try again shortly');
    }
    const latencyMs = Math.round(performance.now() - started);

    let json: unknown;
    try {
        json = JSON.parse(output.text);
    } catch {
        throw new AiOutputError('AI response was not valid JSON', output.text);
    }
    const parsed = request.schema.safeParse(json);
    if (!parsed.success) {
        throw new AiOutputError(
            `AI response failed validation: ${parsed.error.message}`,
            output.text
        );
    }

    return {
        data: parsed.data,
        provider: name,
        model,
        usage: { inputTokens: output.inputTokens, outputTokens: output.outputTokens },
        latencyMs
    };
};
