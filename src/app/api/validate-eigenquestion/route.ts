import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getModelConfig } from "@/lib/llm-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get model config based on environment
const modelConfig = getModelConfig(process.env.NODE_ENV);

interface ValidationResult {
  isEigenquestion: boolean;
  confidence: number;
  reasoning: string;
  questions: string[];
  failurePoints: {
    standaloneValue: boolean;
    cascadeEffect: boolean;
    rootCause: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { workflow, industry } = await request.json();

    if (!workflow || !workflow.responses || workflow.responses.length === 0) {
      return NextResponse.json(
        { error: "Missing workflow data" },
        { status: 400 }
      );
    }

    // Perform the 3-question standalone value test
    const response = await openai.chat.completions.create({
      model: modelConfig.name,
      messages: [
        {
          role: "system",
          content: `You are an operations diagnostic expert validating whether a workflow is truly an eigenquestion.

EIGENQUESTION VALIDATION CRITERIA:

1. STANDALONE VALUE TEST:
   - Would they use ONLY this automation tomorrow (nothing else)?
   - Would they pay for JUST this feature?
   - Would it be used daily/weekly actively?

2. CASCADE EFFECT TEST:
   - Does failure STOP someone else's work?
   - Does it escalate to executive level?
   - How many teams/people are blocked when it fails?

3. ROOT CAUSE TEST:
   - Is this the ACTUAL problem or compensating work?
   - Inversion: If task never existed, would operations improve?
   - Is it reactive tracking (symptom) or proactive gap (cause)?

VALIDATION PROCESS:
- Score each criterion (0-10)
- Eigenquestion requires: Standalone ≥8, Cascade ≥7, Root Cause ≥8
- If ANY criterion fails, provide specific probing questions

Output JSON only:
{
  "isEigenquestion": boolean,
  "confidence": 0-100,
  "reasoning": "Clear explanation of why this is/isn't the eigenquestion",
  "scores": {
    "standaloneValue": 0-10,
    "cascadeEffect": 0-10,
    "rootCause": 0-10
  },
  "failurePoints": {
    "standaloneValue": boolean (true if passed),
    "cascadeEffect": boolean (true if passed),
    "rootCause": boolean (true if passed)
  },
  "questions": ["If not eigenquestion, list 2-3 specific questions to probe deeper"],
  "redFlags": ["Specific concerns about this workflow"]
}`,
        },
        {
          role: "user",
          content: `Industry: ${industry}

Workflow to validate:
${JSON.stringify(workflow, null, 2)}

Validate if this is THE eigenquestion.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const validation: ValidationResult = JSON.parse(
      response.choices[0].message.content || "{}"
    );

    return NextResponse.json(validation);
  } catch (error: any) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate workflow", details: error.message },
      { status: 500 }
    );
  }
}
