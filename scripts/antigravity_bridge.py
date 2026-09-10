#!/usr/bin/env python3
"""
Antigravity CLI Bridge for WeStudy
Invokes `/Users/yabsera/.local/bin/agy --print` to perform genuine AI generation
for Phase 1, Phase 2, Phase 3, and dedicated chat tutor.
"""

import sys
import json
import argparse
import subprocess
import os
import re
import time

AGY_BINARY = "/Users/yabsera/.local/bin/agy"

def sanitize_str(text):
    """Strips null bytes and non-printable control characters to prevent OS execution errors"""
    if not isinstance(text, str):
        return str(text)
    # Remove null bytes and non-printable control chars
    clean = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', ' ', text)
    return clean.strip()

def safe_parse_json(raw_text):
    """Robust JSON parser that extracts outermost JSON and repairs unescaped LaTeX / string escapes"""
    if not raw_text or not isinstance(raw_text, str):
        raise ValueError("Empty or non-string response from Antigravity CLI")

    text = raw_text.strip()

    # Direct parse attempt
    try:
        return json.loads(text)
    except Exception:
        pass

    # Extract outermost JSON object
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    try:
        return json.loads(text)
    except Exception:
        pass

    # Repair invalid string escapes (e.g. LaTeX \frac, \alpha, \Omega, \ge, \cup)
    out = []
    in_string = False
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if not in_string:
            if c == '"':
                in_string = True
            out.append(c)
            i += 1
        else:
            if c == '\\':
                if i + 1 < n:
                    nxt = text[i + 1]
                    if nxt == '"':
                        out.append('\\"')
                        i += 2
                    elif nxt == '\\':
                        out.append('\\\\')
                        i += 2
                    elif nxt == 'n' and (i + 2 >= n or not text[i + 2].isalpha()):
                        out.append('\\n')
                        i += 2
                    elif nxt == 't' and (i + 2 >= n or not text[i + 2].isalpha()):
                        out.append('\\t')
                        i += 2
                    elif nxt == 'r' and (i + 2 >= n or not text[i + 2].isalpha()):
                        out.append('\\r')
                        i += 2
                    elif nxt == 'u' and i + 5 < n and re.match(r'^[0-9a-fA-F]{4}$', text[i+2:i+6]):
                        out.append(text[i:i+6])
                        i += 6
                    else:
                        # Raw or LaTeX backslash (\alpha, \frac, \Omega, \sum, \ge, etc.)
                        out.append('\\\\')
                        i += 1
                else:
                    out.append('\\\\')
                    i += 1
            elif c == '"':
                in_string = False
                out.append(c)
                i += 1
            elif c == '\n':
                out.append('\\n')
                i += 1
            elif c == '\r':
                out.append('\\r')
                i += 1
            elif c == '\t':
                out.append('    ')
                i += 1
            else:
                out.append(c)
                i += 1

    repaired = "".join(out)
    try:
        return json.loads(repaired)
    except Exception:
        # Extra fallback: replace any remaining invalid backslash sequences
        escaped_fallback = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', text)
        return json.loads(escaped_fallback)

def call_antigravity_cli(prompt, max_retries=3):
    """Executes the prompt directly through Antigravity CLI with automatic retries for network drops"""
    if not os.path.exists(AGY_BINARY):
        raise RuntimeError(f"Antigravity CLI binary not found at {AGY_BINARY}")

    clean_prompt = sanitize_str(prompt)

    model_name = os.environ.get("AGY_MODEL", "gemini-3.7-flash-medium")
    cmd = [
        AGY_BINARY,
        "--model",
        model_name,
        "--disable-slash-commands",
        "--output-format",
        "text",
        "--dangerously-skip-permissions",
        "-p",
        clean_prompt
    ]

    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()

            error_msg = result.stderr or result.stdout or f"Exit code {result.returncode}"
            last_error = RuntimeError(f"Antigravity CLI failed (attempt {attempt}/{max_retries}): {error_msg}")

            # If transient network or socket issue, wait and retry
            if any(term in error_msg.lower() for term in ["network", "closed network connection", "connection reset", "timeout", "eof"]):
                time.sleep(attempt * 2)
                continue
            else:
                # If not transient, still retry once more or raise
                time.sleep(1)
        except subprocess.TimeoutExpired:
            last_error = RuntimeError(f"Antigravity CLI timed out after 120s (attempt {attempt}/{max_retries})")
            time.sleep(2)
        except Exception as err:
            last_error = err
            time.sleep(2)

    raise last_error or RuntimeError("Antigravity CLI failed to return a response after retries.")

def run_phase1(payload):
    """Phase 1: Real Document Analysis & Page Range Extraction using Antigravity CLI"""
    file_id = sanitize_str(payload.get("fileId", "file_01"))
    file_name = sanitize_str(payload.get("fileName", "Document.pdf"))
    file_type = sanitize_str(payload.get("fileType", "pdf"))
    raw_content = sanitize_str(payload.get("fileContent", ""))

    content_snippet = raw_content[:20000] if raw_content else f"[Document: {file_name}]"

    prompt = f"""
You are the master curriculum analyzer for the WeStudy exam preparation platform.
Analyze this course document thoroughly:
File Name: "{file_name}"
File Type: {file_type}

DOCUMENT CONTENT / EXCERPT:
---
{content_snippet}
---

TASK & COVERAGE RULES:
1. Provide a comprehensive, high-yield summary of what this entire document covers (3-5 clear sentences).
2. Determine the exact total pages (or estimate realistic page count if slides/notes).
3. Partition 100% OF THE DOCUMENT into discrete topic page ranges from page 1 to the final page.
   CRITICAL: DO NOT SKIP ANY PAGES OR TOPICS. Every single chapter, slide section, and subtopic must be included within the pageRanges array so nothing is missed.

Return strictly a single valid JSON object without any other text:
{{
  "fileId": "{file_id}",
  "fileName": "{file_name}",
  "fileType": "{file_type}",
  "fileSummary": "<comprehensive whole-file summary>",
  "totalPages": <integer total pages>,
  "pageRanges": [
    {{
      "rangeId": "range_{file_id}_r1",
      "startPage": 1,
      "endPage": 5,
      "topicTitle": "<Descriptive Topic Heading>"
    }}
  ]
}}
"""

    raw_response = call_antigravity_cli(prompt)
    data = safe_parse_json(raw_response)
    data["fileId"] = file_id
    data["fileName"] = file_name
    data["fileType"] = file_type
    data["s3"] = payload.get("s3", {})
    return data

def run_phase2(payload):
    """Phase 2: Real Sequence Planning Based Strictly on Summaries using Antigravity CLI"""
    files = payload.get("files", [])
    summaries_text = "\n".join(
        [f"{i+1}. [File ID: {sanitize_str(f.get('fileId'))}] \"{sanitize_str(f.get('fileName'))}\": {sanitize_str(f.get('fileSummary'))}" for i, f in enumerate(files)]
    )

    prompt = f"""
You are the master curriculum sequencer for WeStudy.
Analyze the summaries of all uploaded course materials below and determine the optimal pedagogical order to study them:

COURSE FILE SUMMARIES:
{summaries_text}

RULES:
- Sequence files logically (foundations and prerequisites first, followed by mechanisms, then advanced topics/review).
- Base your sequence ONLY on the provided summaries.

Return strictly a single valid JSON object without any other text:
{{
  "sessionId": "{sanitize_str(payload.get('sessionId'))}",
  "userId": "{sanitize_str(payload.get('userId'))}",
  "subjectId": "{sanitize_str(payload.get('subjectId'))}",
  "totalFiles": {len(files)},
  "orderedFiles": [
    {{
      "sequenceOrder": 1,
      "fileId": "<fileId>",
      "fileName": "<fileName>",
      "fileSummary": "<fileSummary>",
      "pedagogicalRationale": "<Explanation of why this file is studied at this step>"
    }}
  ]
}}
"""

    raw_response = call_antigravity_cli(prompt)
    return safe_parse_json(raw_response)

def run_phase3(payload):
    """Phase 3: Real Study Notes & Quiz Generation in New Context using Antigravity CLI"""
    file_info = payload.get("file", {})
    range_info = payload.get("range", {})
    prefs = payload.get("preferences", {})

    topic_title = sanitize_str(range_info.get("topicTitle", "Lesson"))
    start_p = range_info.get("startPage", 1)
    end_p = range_info.get("endPage", 5)

    density = sanitize_str(prefs.get("questionDensity", "high"))
    q_count = 4 if density == "high" else (2 if density == "medium" else 1)

    depth = sanitize_str(prefs.get("subjectContext", {}).get("targetDepth", "solid_understanding"))
    exam_type = sanitize_str(prefs.get("subjectContext", {}).get("targetExamType", "final_exam"))
    time_avail = sanitize_str(prefs.get("subjectContext", {}).get("timeAvailable", "1_to_2_weeks"))

    file_name = sanitize_str(file_info.get("fileName", "Document"))
    range_text = sanitize_str(payload.get("rangeText", ""))
    range_snippet = range_text[:25000] if range_text else f"[Pages {start_p} to {end_p} of {file_name}]"

    prompt = f"""
You are an expert academic professor and master educator for the WeStudy learning platform.
Your mission is to transform the provided course materials into an exceptionally thorough, crystal-clear, exhaustive, and engaging Coursera-style study lesson.

PEDAGOGICAL TEACHING PRINCIPLES (MUST FOLLOW STRICTLY):
1. ZERO OMISSIONS & COMPLETE EXHAUSTIVE COVERAGE:
   - You MUST include and explain EVERY single concept, theory, theorem, formula, variable, algorithm step, case study, and bullet point present in the source excerpt.
   - Do NOT skip, skim, gloss over, or assume anything. If an idea or term is in the text, it MUST be explicitly addressed and taught in the notes.

2. DEEP UNPACKING OF VAGUE, TERSE, OR CONDENSED IDEAS:
   - If the source notes or slides contain brief, vague, bulleted, compressed, or mathematically terse statements, DO NOT just repeat them.
   - ACTIVELY UNPACK AND DEMYSTIFY THEM: Explain the underlying intuition, the "why" behind the statement, how the mechanism works step-by-step, and why it matters.

3. EXPLAIN IN SIMPLE, INTUITIVE TERMS (FIRST-PRINCIPLES):
   - Always translate technical jargon into clear, plain English before stating the formal definitions.
   - Use vivid, intuitive real-world analogies (e.g. "Think of this like...") to make abstract ideas immediately click.

4. EQUATION & VARIABLE-BY-VARIABLE BREAKDOWN:
   - For every equation, formula, or mathematical notation ($X, Y, P(A|B), \\sum, \\int, \\Omega, \\theta$), explicitly explain what EVERY symbol, subscript, and parameter represents, along with the physical/mathematical intuition.

5. STRUCTURED & VISUAL PRESENTATION:
   - Use clear hierarchical section titles (## Section Title, ### Subsection Title) with generous whitespace.
   - Put ASCII architecture trees, flowcharts, or system diagrams inside ```ascii ... ``` code fences.
   - Use > [!NOTE] for conceptual background, > [!TIP] for high-yield exam tricks & shortcuts, > [!WARNING] for common misconceptions & traps, and > [!IMPORTANT] for core principles.

DOCUMENT: "{file_name}"
TOPIC: "{topic_title}" (Pages {start_p} to {end_p})
STUDENT CONTEXT: Target Exam: {exam_type}, Time Available: {time_avail}, Target Depth: {depth}, Question Density: {density}.

SOURCE TEXT EXCERPT (PAGES {start_p} TO {end_p}):
---
{range_snippet}
---

REQUIREMENTS:
1. summary: Comprehensive high-yield executive overview of this page range (2-4 clear sentences).
2. markdownStudyNotes: Rich, beautifully structured, exhaustive, and easy-to-understand Markdown notes strictly grounded in the excerpt above adhering to all pedagogical principles.
3. keyFormulasOrTerms: 3-6 core terms or equations with simple, intuitive definitions.
4. assessment: Exactly {q_count} multiple-choice questions with 4 options, correctAnswer, and comprehensive explanations detailing why the correct answer is right and why distractors are common student misconceptions.
5. flashcards: 2-3 active-recall flip flashcards with front (prompt/concept) and back (intuitive, clear explanation).

Return strictly a single valid JSON object without any other text:
{{
  "rangeId": "{sanitize_str(range_info.get('rangeId'))}",
  "fileId": "{sanitize_str(file_info.get('fileId'))}",
  "topicTitle": "{topic_title}",
  "pageRange": {{
    "startPage": {start_p},
    "endPage": {end_p}
  }},
  "content": {{
    "summary": "<summary>",
    "markdownStudyNotes": "<exhaustive, crystal-clear, beautifully formatted markdown notes>",
    "keyFormulasOrTerms": [
      {{ "term": "<Term>", "definition": "<Intuitive Definition>" }}
    ]
  }},
  "assessment": {{
    "questions": [
      {{
        "questionId": "q_{sanitize_str(range_info.get('rangeId'))}_1",
        "type": "multiple_choice",
        "question": "<Question text>",
        "options": ["<Option A>", "<Option B>", "<Option C>", "<Option D>"],
        "correctAnswer": "<Option A>",
        "explanation": "<Detailed explanation of correct answer and why other options are wrong>"
      }}
    ],
    "flashcards": [
      {{ "cardId": "fc_{sanitize_str(range_info.get('rangeId'))}_1", "front": "<Front>", "back": "<Back>" }}
    ]
  }}
}}
"""

    raw_response = call_antigravity_cli(prompt)
    return safe_parse_json(raw_response)

def run_chat(payload):
    """Dedicated Lesson Tutor Chat with Antigravity CLI"""
    topic_title = sanitize_str(payload.get("topicTitle", "Lesson"))
    notes = sanitize_str(payload.get("markdownNotes", ""))
    user_msg = sanitize_str(payload.get("userMessage", ""))
    history = payload.get("chatHistory", [])

    history_str = "\n".join([f"{m.get('role', 'user')}: {sanitize_str(m.get('content', ''))}" for m in history[-6:]])

    prompt = f"""
You are the dedicated AI Study Tutor for the topic: "{topic_title}".
You are strictly grounded in these lesson notes:
---
{notes[:5000]}
---

Recent Chat History:
{history_str}

Student Question: "{user_msg}"

TEACHING INSTRUCTIONS:
- Explain concepts from first principles in simple, intuitive terms using relatable real-world analogies.
- If the student asks about a vague or condensed idea, unpack it deeply: explain the "why", the mechanism, and step-by-step logic.
- Break down any formulas variable-by-variable.
- Provide encouraging, structured, and exam-focused explanations.
- Ground your answer directly in the lesson material.
"""

    reply_text = call_antigravity_cli(prompt)
    return {"reply": reply_text}

def main():
    parser = argparse.ArgumentParser(description="Antigravity AI CLI Bridge for WeStudy")
    parser.add_argument("--phase", required=True, choices=["phase1", "phase2", "phase3", "chat"])
    args = parser.parse_args()

    raw_input = sys.stdin.read()
    # Strip null bytes and illegal control chars from stdin before JSON decoding
    sanitized_input = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', ' ', raw_input)
    input_data = json.loads(sanitized_input)

    try:
        if args.phase == "phase1":
            result = run_phase1(input_data)
        elif args.phase == "phase2":
            result = run_phase2(input_data)
        elif args.phase == "phase3":
            result = run_phase3(input_data)
        elif args.phase == "chat":
            result = run_chat(input_data)
        else:
            raise ValueError(f"Unknown phase: {args.phase}")

        print(json.dumps(result))
    except Exception as err:
        sys.stderr.write(f"Antigravity CLI Execution Error: {str(err)}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
