import OpenAI from "openai";
import {
  MODEL_CONFIGS,
  SYSTEM_PROMPTS,
  buildEigenquestionPrompt,
  FALLBACK_RESPONSES,
  getModelConfig,
} from "./llm-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Analyze workflows using eigenquestion discovery framework
 *
 * @param data - Workflow data, department name, and optional evidence files
 * @param options - Optional configuration overrides
 * @returns Eigenquestion analysis with cascade scoring and patterns
 */
export async function analyzeWithLLM(
  data: {
    workflows: any[];
    department: string;
    evidenceFiles?: any[];
  },
  options?: {
    model?: keyof typeof MODEL_CONFIGS;
    temperature?: number;
  }
) {
  // Get configuration (use options or defaults)
  const modelConfig = options?.model
    ? MODEL_CONFIGS[options.model]
    : getModelConfig(process.env.NODE_ENV);

  // Build prompts from config
  const systemPrompt = SYSTEM_PROMPTS.eigenquestion;
  const userPrompt = buildEigenquestionPrompt(data);

  try {
    const response = await openai.chat.completions.create({
      model: modelConfig.name,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: options?.temperature ?? modelConfig.temperature,
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    console.error("LLM Error:", error);
    return FALLBACK_RESPONSES.eigenquestion;
  }
}

/**
 * Generate global organization-wide analysis
 *
 * @param data - Department analyses and organization name
 * @param options - Optional configuration overrides
 * @returns Global eigenquestion with cross-departmental patterns
 */
export async function generateGlobalReport(
  data: {
    departmentAnalyses: any[];
    organization: string;
  },
  options?: {
    model?: keyof typeof MODEL_CONFIGS;
    temperature?: number;
  }
) {
  // Import additional config items
  const { buildGlobalAnalysisPrompt, SYSTEM_PROMPTS, FALLBACK_RESPONSES } =
    await import("./llm-config");

  // Get configuration
  const modelConfig = options?.model
    ? MODEL_CONFIGS[options.model]
    : getModelConfig(process.env.NODE_ENV);

  // Build prompts from config
  const userPrompt = buildGlobalAnalysisPrompt(data);

  try {
    const response = await openai.chat.completions.create({
      model: modelConfig.name,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.global },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: options?.temperature ?? 0.3,
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    console.error("LLM Error:", error);
    return FALLBACK_RESPONSES.global;
  }
}
