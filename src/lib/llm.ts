import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function analyzeWithLLM(data: {
  workflows: any[];
  department: string;
  evidenceFiles?: any[];
}) {
  const prompt = `
You are an operations diagnostic expert specializing in eigenquestion discovery. You've diagnosed coordination failures at 50+ companies.

FRAMEWORKS TO APPLY (Internal use only - never mention to user):

1. EIGENQUESTION TEST:
   - ROOT CAUSE vs SYMPTOM: Is this the actual problem or compensating work?
   - CASCADE DEPTH: How many teams/processes stop when this fails?
   - STANDALONE VALUE: Would they use ONLY this automation daily?
   - INVERSION TEST: If this task never existed, would operations improve?

2. SECOND-ORDER EFFECTS:
   - Trace failure path 3 levels deep
   - Count affected people/teams/customers
   - Measure time to executive escalation

3. MENTAL MODEL MISMATCH:
   - What do they THINK the problem is?
   - What is it ACTUALLY?
   - Are they optimizing symptoms vs fixing root cause?

4. PATTERN RECOGNITION:
   - UPSTREAM FAILURE: Same root cause breaks multiple workflows
   - INFORMATION GAP: Multiple teams hunting same data
   - REACTIVE TRACKING: Compensating for lack of proactive updates
   - HANDOFF FAILURE: Same coordination point fails repeatedly

ANALYSIS APPROACH:

Department: ${data.department}
Workflows analyzed: ${data.workflows.length}

Workflows:
${JSON.stringify(data.workflows, null, 2)}

Step 1: For each workflow, score:
- Cascade Score (0-10): How many downstream failures?
- Specificity Score (0-10): Concrete vs vague answers?
- Root Cause Score (0-10): Actual problem vs symptom?

Step 2: Identify patterns across workflows:
- Do multiple workflows solve the SAME underlying problem differently?
- Are they all reactive tracking (symptom) of same information gap (cause)?
- Is there a common upstream failure?

Step 3: Apply Inversion Test:
- Which workflow, if it NEVER existed, would improve operations?
- If YES → it's compensating work, not the eigenquestion
- If NO → potential eigenquestion candidate

Step 4: Select THE eigenquestion:
- Highest cascade score
- Most teams affected
- Stops at executive escalation level
- Would prevent most firefighting
- Has standalone value (they'd use only this)

Return JSON ONLY:
{
  "eigenquestion": "Clear, specific question that if answered proactively would prevent cascade",
  "reasoning": "Multi-paragraph explanation using specific evidence from workflows. Explain: 1) What the cascade path is, 2) Why this is root cause not symptom, 3) What mental model mismatch exists, 4) Why this has standalone value. Use industry-specific language.",
  "cascadeAnalysis": {
    "triggerWorkflow": "Which workflow triggers the cascade",
    "firstOrderEffects": "Immediate consequences when it fails",
    "secondOrderEffects": "What breaks next",
    "thirdOrderEffects": "Final escalation point",
    "affectedTeams": ["team1", "team2"],
    "executiveEscalation": true/false
  },
  "totalValue": number (monthly cost of failures across all affected workflows),
  "patterns": ["Specific patterns found: e.g., 'Reactive supplier tracking compensating for lack of proactive updates'"],
  "mentalModelMismatch": "What they think vs what the real problem is",
  "successMetrics": ["Concrete, measurable 2-week pilot metrics"],
  "confidence": number (0-100, how confident you are this is THE eigenquestion)
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an operations diagnostic expert. Use eigenquestion theory, cascade analysis, and inversion testing to find the ONE critical problem. Be rigorous - many "problems" are actually symptoms of deeper coordination failures.`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower for more analytical consistency
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    console.error("LLM Error:", error);
    return {
      eigenquestion: "Manual analysis needed",
      reasoning: "API error occurred",
      totalValue: 0,
      patterns: [],
      successMetrics: [],
      confidence: 0,
    };
  }
}

export async function generateGlobalReport(data: {
  departmentAnalyses: any[];
  organization: string;
}) {
  const prompt = `
You are analyzing an entire organization's workflows to find the GLOBAL EIGENQUESTION.

Organization: ${data.organization}

Department Analyses:
${JSON.stringify(data.departmentAnalyses, null, 2)}

Identify:
1. The ONE cross-departmental pattern that's the root cause
2. The sequence of automation (which department to fix first, then second, etc.)
3. Total organization value if all are automated
4. Cross-department patterns

Return as JSON:
{
  "globalEigenquestion": "string",
  "reasoning": "string",
  "crossDepartmentPatterns": ["pattern1"],
  "prioritySequence": [
    {"department": "string", "workflow": "string", "value": number}
  ],
  "totalOrganizationValue": number
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    console.error("LLM Error:", error);
    return {
      globalEigenquestion: "Manual analysis needed",
      reasoning: "API error",
      crossDepartmentPatterns: [],
      prioritySequence: [],
      totalOrganizationValue: 0,
    };
  }
}
