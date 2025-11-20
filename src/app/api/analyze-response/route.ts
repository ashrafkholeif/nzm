import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MODEL_CONFIGS, getModelConfig } from "@/lib/llm-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get model config based on environment
const modelConfig = getModelConfig(process.env.NODE_ENV);

interface AnalysisResult {
  cascadeScore: number;
  specificityScore: number;
  isRootCause: boolean;
  isCompensatingWork: boolean;
  secondOrderEffects: string;
  mentalModelMismatch: string;
  nextAction:
    | "CASCADE_PROBE"
    | "FORCE_SPECIFICITY"
    | "VALIDATE_EIGENQUESTION"
    | "MOVE_ON"
    | "NEW_WORKFLOW";
  reasoning: string;
}

interface QuestionResult {
  question: string;
  explanation: string;
  questionType: string;
}

export async function POST(request: NextRequest) {
  try {
    const { response, context, industry, workflowCount } = await request.json();

    // Special case: Initial start
    if (response === "START") {
      return NextResponse.json({
        analysis: {
          cascadeScore: 0,
          specificityScore: 0,
          nextAction: "MOVE_ON",
        },
        question:
          "Let's start with your most time-consuming coordination task. What's the one workflow where you spend hours chasing information or waiting for updates?",
        explanation:
          "We're looking for tasks that consume significant time AND might block other work when they fail. Coordination tasks often reveal cascade patterns.",
      });
    }

    // Step 1: Hidden reasoning - analyze the response using frameworks
    const reasoningResponse = await openai.chat.completions.create({
      model: modelConfig.name,
      messages: [
        {
          role: "system",
          content: `You are an operations diagnostic expert. Analyze the user's response using these frameworks (NEVER mention them to user):

EIGENQUESTION TEST:
- Is this ROOT cause or symptom?
- Does failure CASCADE (stop someone else's work) or just waste time?
- Standalone Value: Would they use ONLY this automation daily?

INVERSION CHECK:
- What if this task NEVER existed? Would operations improve?
- If YES → compensating work, not eigenquestion
- If NO → potential cascade trigger

SECOND-ORDER EFFECTS:
- Trace failure path 3 levels deep
- Does it reach executive escalation?
- Count how many people/teams affected

MENTAL MODEL MISMATCH:
- What does user THINK the problem is?
- What is it ACTUALLY?
- Are they optimizing symptoms vs fixing root cause?

RESPONSE QUALITY:
- Specificity Score (0-10): Concrete examples/numbers or vague generalities?
- Cascade Score (0-10): Does failure stop other work? How many affected?

CASCADE INDICATORS:
- Words: "stops", "blocks", "delays", "waiting", "escalates", "production halt"
- Patterns: Multiple teams involved, time-sensitive, external dependencies

VAGUENESS INDICATORS:
- Words: "sometimes", "usually", "often", "various", "multiple"
- No specific numbers, times, or examples

Output JSON only:
{
  "cascadeScore": 0-10,
  "specificityScore": 0-10,
  "isRootCause": boolean,
  "isCompensatingWork": boolean,
  "secondOrderEffects": "describe the failure cascade path",
  "mentalModelMismatch": "what they think vs what it really is",
  "nextAction": "CASCADE_PROBE" | "FORCE_SPECIFICITY" | "VALIDATE_EIGENQUESTION" | "MOVE_ON" | "NEW_WORKFLOW",
  "reasoning": "Internal analysis explaining your decision"
}`,
        },
        {
          role: "user",
          content: `Industry: ${industry}
Department: ${context.department || "unknown"}
Workflows analyzed: ${workflowCount}
Previous context: ${JSON.stringify(context.previousAnswers || [])}
Current workflow depth: ${context.currentWorkflowDepth || 0}

User's latest response: "${response}"

Analyze and decide next action. 

Rules:
- If cascadeScore >= 8 AND specificityScore < 5: FORCE_SPECIFICITY
- If cascadeScore >= 8 AND specificityScore >= 5: CASCADE_PROBE (go deeper)
- If cascadeScore >= 8 AND currentWorkflowDepth >= 3: VALIDATE_EIGENQUESTION
- If cascadeScore < 5: MOVE_ON (or NEW_WORKFLOW if depth > 0)
- If specificityScore < 4: FORCE_SPECIFICITY`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const analysis: AnalysisResult = JSON.parse(
      reasoningResponse.choices[0].message.content || "{}"
    );

    // Step 2: Generate next question based on hidden analysis
    const questionResponse = await openai.chat.completions.create({
      model: modelConfig.name,
      messages: [
        {
          role: "system",
          content: `You are an operations diagnostic expert specializing in ${industry} operations. Generate the next question based on the analysis.

TONE PRINCIPLES:
1. Respectful Challenge - "Most people think X. Here's what the data reveals."
2. Industry Credibility - Use specific ${industry} language and patterns
3. Pattern Recognition - "I've seen this at similar ${industry} companies"
4. Socratic Precision - Probe causes, not symptoms
5. Progressive Build - Reveal patterns as they emerge

NEVER:
- Use jargon (eigenquestion, mental models, cascade theory, second-order effects)
- Explain your reasoning process or frameworks
- Accept vague answers without probing
- Ask generic questions
- Use emojis or casual language

ALWAYS:
- Explain WHY the question matters to THEIR specific situation
- Use concrete ${industry} examples when explaining
- Distinguish cascade failures (blocks others) from efficiency waste (just slow)
- Challenge weak answers respectfully with industry authority
- Show you understand ${industry} patterns

QUESTION TYPES:

CASCADE_PROBE (go 3 levels deeper):
- "When this fails, what breaks FIRST?"
- "Walk me through last month's worst incident"
- "How many hours does ONE failure cost across all teams?"
- "If this NEVER failed again, what specific changes would you see?"

FORCE_SPECIFICITY (demand concrete examples):
- "Let's get concrete. Last week specifically - how many hours? Which suppliers?"
- "Show me an actual example from this month"
- "Give me numbers: How many times? How long? Who was involved?"

VALIDATE_EIGENQUESTION (test standalone value):
- "Quick validation: If I automate ONLY this task, would your team use it tomorrow?"
- "Does this failure directly cause production stops, or is it just inefficient?"
- "Would you pay for just this automation, nothing else?"

MOVE_ON (shallow dive, next workflow):
- "Got it. That's efficiency work but not mission-critical. What's another major coordination task?"

NEW_WORKFLOW (finish current, start new):
- "I see the pattern here. Let's look at another workflow. What's your second-biggest coordination bottleneck?"`,
        },
        {
          role: "user",
          content: `Analysis Results:
- Cascade Score: ${analysis.cascadeScore}/10
- Specificity Score: ${analysis.specificityScore}/10
- Is Root Cause: ${analysis.isRootCause}
- Is Compensating Work: ${analysis.isCompensatingWork}
- Second Order Effects: ${analysis.secondOrderEffects}
- Mental Model Mismatch: ${analysis.mentalModelMismatch}
- Next Action: ${analysis.nextAction}
- Internal Reasoning: ${analysis.reasoning}

Context:
- Industry: ${industry}
- Workflows analyzed: ${workflowCount}
- Current workflow depth: ${context.currentWorkflowDepth || 0}
- User response: "${response}"

Generate the next question that:
1. Matches the Next Action type
2. Explains WHY this matters to ${industry} specifically
3. Uses industry-specific language
4. ${
            analysis.nextAction === "CASCADE_PROBE"
              ? "Goes deeper on the failure cascade path"
              : ""
          }
5. ${
            analysis.nextAction === "FORCE_SPECIFICITY"
              ? "Demands concrete numbers and examples"
              : ""
          }
6. ${
            analysis.nextAction === "VALIDATE_EIGENQUESTION"
              ? "Tests if this is truly the eigenquestion"
              : ""
          }

Return JSON only:
{
  "question": "The actual question to ask",
  "explanation": "Why this matters to their specific ${industry} situation (1-2 sentences)"
}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const questionData: QuestionResult = JSON.parse(
      questionResponse.choices[0].message.content || "{}"
    );

    // Return both analysis (for UI indicators) and question
    return NextResponse.json({
      analysis: {
        cascadeScore: analysis.cascadeScore,
        specificityScore: analysis.specificityScore,
        nextAction: analysis.nextAction,
        isHighPriority: analysis.cascadeScore >= 8,
      },
      question: questionData.question,
      explanation: questionData.explanation,
    });
  } catch (error: any) {
    console.error("Response analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze response", details: error.message },
      { status: 500 }
    );
  }
}
