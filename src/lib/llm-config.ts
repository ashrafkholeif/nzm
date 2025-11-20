/**
 * LLM Configuration - Plug-and-Play Prompts & Schemas
 *
 * This file centralizes all LLM reasoning logic, prompts, and response formats.
 * Easy to update, version, and maintain without touching the main LLM logic.
 */

// ============================================================================
// MODEL CONFIGURATIONS
// ============================================================================

export const MODEL_CONFIGS = {
  default: {
    name: "gpt-4-turbo-preview",
    temperature: 0.2,
    maxTokens: 4000,
    description: "Production model - analytical consistency, JSON support",
  },
  fast: {
    name: "gpt-3.5-turbo",
    temperature: 0.3,
    maxTokens: 2000,
    description: "Development/testing - faster, cheaper",
  },
  creative: {
    name: "gpt-4-turbo-preview",
    temperature: 0.7,
    maxTokens: 4000,
    description: "More creative/exploratory analysis",
  },
} as const;

// ============================================================================
// ANALYSIS FRAMEWORKS
// ============================================================================

export const FRAMEWORKS = {
  eigenquestion: {
    name: "Eigenquestion Discovery",
    description:
      "Find root coordination problems vs symptoms using cascade analysis",
    version: "2.0",
    lastUpdated: "2024-11-20",
  },
  efficiency: {
    name: "Efficiency Analysis",
    description: "Focus on time savings and ROI metrics",
    version: "1.0",
    lastUpdated: "2024-11-20",
  },
  global: {
    name: "Global Organization Analysis",
    description: "Cross-departmental pattern detection and sequencing",
    version: "1.0",
    lastUpdated: "2024-11-20",
  },
} as const;

// ============================================================================
// SYSTEM PROMPTS (The "Personality" of the AI)
// ============================================================================

export const SYSTEM_PROMPTS = {
  eigenquestion: `You are an operations diagnostic expert. Use eigenquestion theory, cascade analysis, and inversion testing to find the ONE critical problem. Be rigorous - many "problems" are actually symptoms of deeper coordination failures.`,

  efficiency: `You are an efficiency analyst focused on measurable time and cost savings. Identify the highest ROI opportunities for automation and process improvement.`,

  global: `You are a strategic operations analyst examining organization-wide patterns. Find cross-departmental root causes and optimal automation sequences.`,
} as const;

// ============================================================================
// USER PROMPT TEMPLATES (The "Instructions" for Analysis)
// ============================================================================

export const buildEigenquestionPrompt = (data: {
  workflows: any[];
  department: string;
  evidenceFiles?: any[];
}) => `
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

export const buildGlobalAnalysisPrompt = (data: {
  departmentAnalyses: any[];
  organization: string;
}) => `
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

// ============================================================================
// RESPONSE SCHEMAS (What Data Structure to Expect Back)
// ============================================================================

export const RESPONSE_SCHEMAS = {
  eigenquestion: {
    eigenquestion: "string",
    reasoning: "string",
    cascadeAnalysis: {
      triggerWorkflow: "string",
      firstOrderEffects: "string",
      secondOrderEffects: "string",
      thirdOrderEffects: "string",
      affectedTeams: ["string"],
      executiveEscalation: "boolean",
    },
    totalValue: "number",
    patterns: ["string"],
    mentalModelMismatch: "string",
    successMetrics: ["string"],
    confidence: "number",
  },

  global: {
    globalEigenquestion: "string",
    reasoning: "string",
    crossDepartmentPatterns: ["string"],
    prioritySequence: [
      {
        department: "string",
        workflow: "string",
        value: "number",
      },
    ],
    totalOrganizationValue: "number",
  },
} as const;

// ============================================================================
// FALLBACK RESPONSES (Error Handling)
// ============================================================================

export const FALLBACK_RESPONSES = {
  eigenquestion: {
    eigenquestion: "Manual analysis needed",
    reasoning: "API error occurred",
    totalValue: 0,
    patterns: [],
    successMetrics: [],
    confidence: 0,
    cascadeAnalysis: {
      triggerWorkflow: "",
      firstOrderEffects: "",
      secondOrderEffects: "",
      thirdOrderEffects: "",
      affectedTeams: [],
      executiveEscalation: false,
    },
    mentalModelMismatch: "",
  },

  global: {
    globalEigenquestion: "Manual analysis needed",
    reasoning: "API error",
    crossDepartmentPatterns: [],
    prioritySequence: [],
    totalOrganizationValue: 0,
  },
} as const;

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get model configuration by environment or name
 */
export function getModelConfig(env?: string) {
  if (env === "production") return MODEL_CONFIGS.default;
  if (env === "development") return MODEL_CONFIGS.fast;
  return MODEL_CONFIGS.default;
}

/**
 * Get framework info
 */
export function getFramework(name: keyof typeof FRAMEWORKS) {
  return FRAMEWORKS[name];
}

/**
 * Version tracking for prompts
 */
export const PROMPT_VERSION = {
  current: "2.0",
  lastUpdated: "2024-11-20",
  changelog: [
    {
      version: "2.0",
      date: "2024-11-20",
      changes: "Refactored to config-based structure",
    },
    {
      version: "1.0",
      date: "2024-11-15",
      changes: "Initial eigenquestion implementation",
    },
  ],
};
