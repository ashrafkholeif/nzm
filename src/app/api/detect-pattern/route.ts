import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getModelConfig } from "@/lib/llm-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get model config based on environment
const modelConfig = getModelConfig(process.env.NODE_ENV);

interface PatternAnalysis {
  patternDetected: boolean;
  patternType:
    | "upstream_failure"
    | "information_gap"
    | "handoff_failure"
    | "reactive_tracking"
    | "none";
  confidence: number;
  description: string;
  hypothesis: string;
  affectedWorkflows: number[];
  commonTrigger?: string;
  recommendation: string;
}

export async function POST(request: NextRequest) {
  try {
    const { workflows, industry } = await request.json();

    if (!workflows || workflows.length < 2) {
      return NextResponse.json({
        patternDetected: false,
        message: "Need at least 2 workflows to detect patterns",
      });
    }

    const response = await openai.chat.completions.create({
      model: modelConfig.name,
      messages: [
        {
          role: "system",
          content: `You are an operations diagnostic expert analyzing ${industry} workflows for cross-workflow patterns.

PATTERN TYPES TO DETECT:

1. UPSTREAM_FAILURE: Same root cause breaks multiple workflows
   - Example: Supplier doesn't send updates → 3 teams chase same information
   - Signal: Multiple workflows mention same external party/system

2. INFORMATION_GAP: Multiple teams hunting same data from same source
   - Example: Everyone calling logistics, accounting, suppliers for status
   - Signal: Multiple "tracking" or "checking" or "calling for status" tasks

3. HANDOFF_FAILURE: Same coordination point fails repeatedly
   - Example: Warehouse → Production handoff always delayed
   - Signal: Multiple workflows mention same department boundary

4. REACTIVE_TRACKING: All workflows are compensating for lack of proactive updates
   - Example: Call suppliers (reactive) vs suppliers auto-notify (proactive)
   - Signal: Words like "chase", "follow up", "check status", "call to confirm"

ANALYSIS APPROACH:
1. Look for common triggers across workflows
2. Identify if workflows are ROOT tasks or COMPENSATING tasks
3. Check if multiple workflows solve the SAME underlying problem differently
4. Detect information flow gaps (proactive vs reactive)

${
  industry === "automotive"
    ? `
AUTOMOTIVE-SPECIFIC PATTERNS:
- Supplier coordination cascades (affects assembly line directly)
- CKD part tracking (customs delays cascade to production)
- Quality issue escalation (stops line if not caught early)
`
    : ""
}

${
  industry === "logistics"
    ? `
LOGISTICS-SPECIFIC PATTERNS:
- Carrier coordination (demurrage fees if late)
- Customs clearance tracking (delays cascade to delivery)
- Route optimization (affects multiple shipments)
`
    : ""
}

Output JSON only:
{
  "patternDetected": boolean,
  "patternType": "upstream_failure" | "information_gap" | "handoff_failure" | "reactive_tracking" | "none",
  "confidence": 0-100,
  "description": "Clear explanation of the pattern you detected",
  "hypothesis": "Your theory about the real eigenquestion",
  "affectedWorkflows": [array of workflow indices that share this pattern],
  "commonTrigger": "What triggers all these workflows (if same)",
  "recommendation": "What to explore next to validate this pattern"
}`,
        },
        {
          role: "user",
          content: `Industry: ${industry}
Number of workflows: ${workflows.length}

Workflows to analyze:
${workflows
  .map(
    (w: any, i: number) => `
Workflow ${i + 1}:
${JSON.stringify(w, null, 2)}
`
  )
  .join("\n")}

Analyze for cross-workflow patterns.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const pattern: PatternAnalysis = JSON.parse(
      response.choices[0].message.content || "{}"
    );

    return NextResponse.json(pattern);
  } catch (error: any) {
    console.error("Pattern detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect patterns", details: error.message },
      { status: 500 }
    );
  }
}
