# **Dynamic Diagnostic Script Architecture**

## **Core Problem with Static Script**

Treats all workflows equally. Misses cascade patterns. Generic questions get generic answers.

---

## **Dynamic Script Principles**

### **1\. LLM-at-Every-Step**

Each response triggers analysis:

* Is this a cascade trigger? → Go 3 levels deeper  
* Is this efficiency work? → Shallow dive, move on  
* Is this surface-level? → Probe specifics  
* Is this the eigenquestion? → Validate with Standalone Test

### **2\. Contextual Explanation**

Don't just ask. Explain WHY it matters to THEM.

**Static:** "What triggers this task?"  
 **Dynamic:** "You mentioned calling suppliers takes 4 hours. I need to understand the trigger because if it's time-based (8am daily), automation is straightforward. If it's event-based (when production flags shortage), we need to intercept that event. Which is it?"

### **3\. Adaptive Depth**

* Generic area? → 1 question, move on  
* Cascade indicator detected? → 5-question deep dive  
* Contradictory answers? → Clarification loop

---

## **Dynamic Question Architecture**

### **Meta-Prompt Pattern**

```
Context: [previous answers]
Industry: [automotive/logistics/retail]
Red Flags: [cascade indicators seen so far]

User just said: "[response]"

Analyze:
1. Does this task CAUSE downstream failures or just waste time?
2. If it fails, does someone else's work stop?
3. Is user being specific or vague?

Next Question Options:
A) Cascade Probe: "When this fails, what breaks FIRST?"
B) Specificity: "Walk me through last week's actual incident"
C) Value Test: "If only THIS was automated, would you use it daily?"
D) Move On: "Got it. Let's look at another workflow."

Choose: [A/B/C/D]
Ask: [generated question]
Explain: [why this matters for their situation]
```

---

## **Dynamic Flow Example**

**User:** "We call suppliers every morning"

**Static Script:** → Next question  
 **Dynamic Script:**

```
LLM Analysis:
- "Call suppliers" = high manual effort (good)
- "Every morning" = time-based trigger (automatable)
- But WHY do they call? Need to know if it's:
  a) Checking on existing late orders (reactive = cascade)
  b) Confirming today's scheduled deliveries (proactive = efficiency)

Decision: This could be THE eigenquestion. Probe cascade potential.
```

**Agent Response:**  
 "When you call suppliers, are you:

* Chasing LATE orders that are blocking production?  
* Or confirming on-time deliveries as precaution?

This distinction matters: if it's late orders, then NOT calling means production stops (cascade). If it's precautionary, it's efficiency gain but not fire prevention. Which is it?"

---

## **Key Dynamic Mechanisms**

### **1\. Cascade Detection Algorithm**

```
If user mentions:
- "stops production"
- "blocks other team"
- "escalates to management"
- "causes delays in [X]"

Then: STOP. Go 5 levels deep here.
Questions:
1. "How often does this cascade happen?"
2. "Walk me through last month's worst incident"
3. "What's the cost of ONE cascade event?"
4. "If this NEVER failed again, what changes?"
5. "Is this the ROOT cause or symptom?"
```

### **2\. Vagueness Detector**

```
If response contains:
- "sometimes" "usually" "often"
- No specific numbers
- No concrete examples

Then: Force specificity
"Let's get concrete. Last week, how many hours did this actually take? Which suppliers specifically? Show me your tracking sheet."
```

### **3\. Standalone Value Real-Time Test**

```
After workflow mapping, immediate validation:
"Quick check - if I automate ONLY this task:
1. Would your team use it tomorrow? [Y/N]
2. Does it prevent production stops? [Y/N]  
3. Would you pay for just this, nothing else? [Y/N]

If NOT 3/3 YES, this isn't your eigenquestion."
```

### **4\. Industry Pattern Matching**

```
Pre-loaded patterns:
Automotive Assembly:
- Supplier coordination (high cascade potential)
- CKD part tracking (high cascade potential)
- Production reporting (low cascade potential)

When user says "supplier delays":
Auto-inject: "In automotive assembly, supplier delays typically cascade to line stoppage within 4 hours. Is that your pattern?"
```

---

## **Progressive Revelation**

Show user what you're discovering:

**After 3 workflows:**

```
"I'm seeing a pattern:
- Workflow 1: Supplier calls → When fails → Production stops
- Workflow 2: Logistics tracking → When fails → Late delivery fees
- Workflow 3: Inventory reconciliation → When fails → Payment delays

The common thread: All three feed production planning. 

Hypothesis: Your eigenquestion isn't in these individual tasks. It's in the HANDOFF between procurement and production. Should we explore that?"
```

---

## **Smart Branching Logic**

```py
def next_question(context):
    if cascade_detected(context):
        return deep_dive_cascade()
    
    if vague_response(context):
        return force_specificity()
    
    if standalone_value == True:
        return validate_eigenquestion()
    
    if workflows_count < 2:
        return "Let's map another workflow"
    
    if pattern_emerging(context):
        return "I'm seeing X pattern. Let's test this hypothesis..."
    
    return generate_contextual_question()
```

---

## **Implementation Requirements**

**Technical:**

* GPT-4 API at each step (streaming for speed)  
* Conversation state management  
* Industry pattern library  
* Cascade keyword detection  
* Response quality scoring

**Prompt Engineering:**

```
System Role:
"You are a diagnostic expert trained in eigenquestion discovery. 
Your goal: Find the ONE coordination task whose failure causes most downstream fires.

Rules:
1. When you detect cascade potential, go 5 levels deep
2. When user is vague, demand specifics
3. When task is just efficiency (not fire prevention), note it and move on
4. After 2-3 workflows, identify cross-workflow patterns
5. Explain WHY each question matters to THEIR situation
6. Use industry-specific language (automotive = 'line stoppage', logistics = 'demurrage')

Current context: [state]
Last user response: [response]

What's your next question and why?"
```

---

## **Efficiency Gains vs Static Script**

**Static:** 10 questions × 3 workflows \= 30 questions  
 **Dynamic:**

* 15 questions total (adaptive depth)  
* 3 questions shallow (efficiency tasks)  
* 12 questions deep (cascade task)  
* Pattern recognition after workflow 2  
* Eigenquestion confidence: 85% vs 60%

**Time:** 30 min vs 45 min  
 **Quality:** High-confidence eigenquestion vs. "best guess from data"

---

## **Critical Success Factors**

1. **Meta-prompt quality** \- LLM must DECIDE, not just ask  
2. **Industry templates** \- Automotive ≠ Logistics patterns  
3. **Real-time validation** \- Catch bad data immediately  
4. **Progressive revelation** \- Show user the emerging pattern  
5. **Adaptive depth** \- 5 questions on eigenquestion, 1 question on efficiency tasks

---

## **Eigenquestion for This System**

**Static script asks: "What tasks do you do?"**  
 **Dynamic script asks: "Which task's failure creates the cascade that reaches your CEO's desk?"**

That's the difference.

