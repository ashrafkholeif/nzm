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
You are an expert at identifying eigenquestions - the single most critical coordination problem that, if solved, would eliminate the most downstream issues.

Analyze these workflows from the ${data.department} department:
${JSON.stringify(data.workflows, null, 2)}

Consider:
1. Which workflow failure causes the most cascading problems?
2. Which automation would prevent the most firefighting?
3. Which has the highest standalone value?
4. What patterns reveal a deeper coordination issue?

Identify:
1. The EIGENQUESTION - the ONE problem to solve first
2. Clear reasoning why
3. Estimated monthly value
4. Success metrics for 2-week pilot

Return as JSON:
{
  "eigenquestion": "string",
  "reasoning": "string",
  "totalValue": number,
  "patterns": ["pattern1", "pattern2"],
  "successMetrics": ["metric1", "metric2"]
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
      eigenquestion: "Manual analysis needed",
      reasoning: "API error occurred",
      totalValue: 0,
      patterns: [],
      successMetrics: [],
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
