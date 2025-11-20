# LLM Configuration - Quick Guide

This document explains how to easily modify the AI reasoning logic, prompts, and model configurations using the new plug-and-play structure.

## 📁 File Structure

```
src/lib/
  ├── llm-config.ts    ← All prompts, schemas, and model configs
  └── llm.ts           ← Main LLM functions (rarely need to change)

src/app/api/
  ├── analyze-response/
  ├── detect-pattern/
  └── validate-eigenquestion/
```

## 🎯 What Can You Change?

### 1. **Model Configuration** (Lines 12-28 in `llm-config.ts`)

```typescript
export const MODEL_CONFIGS = {
  default: {
    name: "gpt-4-turbo-preview", // ← Change model here
    temperature: 0.2, // ← Adjust creativity (0=deterministic, 1=creative)
    maxTokens: 4000,
    description: "Production model",
  },
  fast: {
    name: "gpt-3.5-turbo", // ← Cheaper/faster for testing
    temperature: 0.3,
    maxTokens: 2000,
  },
};
```

**Available Models:**

- `gpt-4-turbo-preview` - Best quality, supports JSON mode (current)
- `gpt-4o` - Latest multimodal model
- `gpt-3.5-turbo` - Faster, cheaper for development
- `gpt-4` - Standard GPT-4 (no JSON mode)

---

### 2. **System Prompts** (Lines 58-70 in `llm-config.ts`)

The "personality" of the AI:

```typescript
export const SYSTEM_PROMPTS = {
  eigenquestion: `You are an operations diagnostic expert...`,
  // ↑ Edit this to change how the AI thinks
};
```

**How to Update:**

1. Open `src/lib/llm-config.ts`
2. Find `SYSTEM_PROMPTS`
3. Modify the text to change the AI's approach
4. Save - changes apply immediately!

---

### 3. **Analysis Logic** (Lines 78-155 in `llm-config.ts`)

The detailed instructions for analysis:

```typescript
export const buildEigenquestionPrompt = (data) => `
FRAMEWORKS TO APPLY:

1. EIGENQUESTION TEST:
   - ROOT CAUSE vs SYMPTOM: ...
   - CASCADE DEPTH: ...
   // ↑ Modify these frameworks
```

**Common Updates:**

- Add industry-specific terminology
- Change scoring criteria (cascade, specificity)
- Add new analysis dimensions
- Adjust cascade depth levels

---

### 4. **Response Format** (Lines 177-209 in `llm-config.ts`)

What data structure comes back:

```typescript
export const RESPONSE_SCHEMAS = {
  eigenquestion: {
    eigenquestion: "string",
    reasoning: "string",
    cascadeAnalysis: { ... },
    totalValue: "number",
    // ↑ Add new fields here
    yourNewField: "string",  // Example
  }
}
```

**To Add a New Field:**

1. Add to schema in `llm-config.ts`
2. Add to prompt's JSON output section
3. Update TypeScript interfaces if needed

---

## 🚀 Common Use Cases

### **A. Switch to Faster Model for Development**

```typescript
// In llm-config.ts, line 24-28
fast: {
  name: "gpt-3.5-turbo",  // Already set!
  temperature: 0.3,
  maxTokens: 2000,
}
```

Then set `NODE_ENV=development` to auto-use fast model.

---

### **B. Add Industry-Specific Language**

**Option 1: Edit system prompt**

```typescript
// llm-config.ts, line 59
eigenquestion: `You are an automotive operations expert specializing in
supply chain coordination failures. Use industry terms like JIT,
Kanban, Tier-1 suppliers...`,
```

**Option 2: Edit analysis frameworks**

```typescript
// llm-config.ts, line 93
4. PATTERN RECOGNITION:
   - UPSTREAM FAILURE: Supplier delays causing line stops
   - JIT BREAKDOWN: Inventory buffer violations
   - PART SHORTAGE CASCADE: ...
```

---

### **C. Change Cascade Scoring Logic**

```typescript
// llm-config.ts, line 129
Step 1: For each workflow, score:
- Cascade Score (0-10): How many downstream processes halt?
  * 0-3: Only affects one person
  * 4-6: Blocks a team (5-10 people)
  * 7-9: Stops multiple departments
  * 10: Requires CEO intervention  // ← Adjust thresholds
```

---

### **D. Add New Analysis Dimension**

```typescript
// 1. Add to prompt output (llm-config.ts, line 144)
Return JSON ONLY:
{
  "eigenquestion": "...",
  "reasoning": "...",
  "riskLevel": "low|medium|high|critical",  // ← New field
  ...
}

// 2. Add to response schema (llm-config.ts, line 189)
eigenquestion: {
  eigenquestion: "string",
  reasoning: "string",
  riskLevel: "string",  // ← New field
  ...
}

// 3. Add to fallback (llm-config.ts, line 223)
eigenquestion: {
  ...
  riskLevel: "unknown",  // ← Default value
}
```

---

## 🔧 Advanced: Using Different Configs Per API Route

If you want different models for different operations:

```typescript
// In analyze-response/route.ts
import { MODEL_CONFIGS } from "@/lib/llm-config";

// Use creative model for brainstorming
const response = await openai.chat.completions.create({
  model: MODEL_CONFIGS.creative.name,  // Instead of modelConfig.name
  temperature: 0.7,  // Override default
  ...
});
```

---

## 📊 Quick Reference Table

| **What to Change**    | **File**        | **Line(s)** | **Restart Needed?** |
| --------------------- | --------------- | ----------- | ------------------- |
| Model name            | `llm-config.ts` | 14-16       | No                  |
| Temperature           | `llm-config.ts` | 17          | No                  |
| System prompt         | `llm-config.ts` | 59-70       | No                  |
| Analysis frameworks   | `llm-config.ts` | 93-128      | No                  |
| Scoring criteria      | `llm-config.ts` | 129-140     | No                  |
| Output JSON structure | `llm-config.ts` | 144-155     | Yes\*               |
| Response schema       | `llm-config.ts` | 177-209     | Yes\*               |

\*Only if you add new fields that need TypeScript type updates

---

## 🎓 Examples

### **Example 1: More Creative Responses**

```typescript
// llm-config.ts, line 17
temperature: 0.7,  // Changed from 0.2
```

### **Example 2: Automotive-Specific Prompts**

```typescript
// llm-config.ts, line 93
4. AUTOMOTIVE PATTERN RECOGNITION:
   - SUPPLIER DELAY CASCADE: JIT breakdown causing line stops
   - QUALITY HOLD RIPPLE: Failed inspection blocking shipments
   - VARIANT COMPLEXITY: Too many SKUs causing coordination failures
   - CHANGEOVER CHAOS: Tooling/setup delays cascading to schedules
```

### **Example 3: Add Monthly Cost Analysis**

```typescript
// llm-config.ts, add to JSON output (line 151)
"monthlyCostBreakdown": {
  "laborHours": number,
  "delayPenalties": number,
  "expeditingCosts": number,
  "total": number
}
```

---

## 🐛 Troubleshooting

**Problem:** Changes not taking effect

- **Solution:** Hard refresh browser (Cmd+Shift+R on Mac)

**Problem:** TypeScript errors after adding field

- **Solution:** Update the TypeScript interface in the API route file

**Problem:** Model doesn't support JSON mode

- **Solution:** Use `gpt-4-turbo-preview` or `gpt-3.5-turbo` (not `gpt-4`)

**Problem:** Responses too expensive

- **Solution:** Set `NODE_ENV=development` to use cheaper model

---

## 📝 Version History

- **v2.0** (2024-11-20) - Refactored to config-based structure
- **v1.0** (2024-11-15) - Initial eigenquestion implementation

---

## 💡 Pro Tips

1. **Test Changes:** Use `fast` model config during testing
2. **Version Control:** Add version notes in `PROMPT_VERSION.changelog`
3. **A/B Testing:** Create multiple prompt versions and compare results
4. **Industry Templates:** Create separate config files per industry
5. **Backup Prompts:** Keep working prompts in comments before experimenting

---

Need help? All configuration is in **one file**: `src/lib/llm-config.ts` 🎯
