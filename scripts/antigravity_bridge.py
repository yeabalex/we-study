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

    content_snippet = raw_content[:8000] if raw_content else f"[Document: {file_name}]"

    prompt = f"""
You are the AI curriculum analyzer for the WeStudy exam preparation platform.
Analyze this course document:
File Name: "{file_name}"
File Type: {file_type}

DOCUMENT EXCERPT / CONTENT:
---
{content_snippet}
---

TASK:
1. Provide a concise, high-yield summary of what this entire document is about (2-4 sentences).
2. Determine total pages (or estimate realistic page count if slides/notes).
3. Identify discrete topic page ranges with descriptive topic headings.

Return strictly a single valid JSON object without any other text:
{{
  "fileId": "{file_id}",
  "fileName": "{file_name}",
  "fileType": "{file_type}",
  "fileSummary": "<concise whole-file summary>",
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

    file_name = sanitize_str(file_info.get("fileName", "Document"))
    range_text = sanitize_str(payload.get("rangeText", ""))
    range_snippet = range_text[:7000] if range_text else f"[Pages {start_p} to {end_p} of {file_name}]"

    prompt = f"""
You are an expert academic professor and exam tutor for WeStudy.
Generate a comprehensive, Coursera-style study lesson strictly grounded in the following course material excerpt:
- Document: "{file_name}"
- Topic: "{topic_title}" (Pages {start_p} to {end_p})
- Student Context: Target Exam: {exam_type}, Time Available: {time_avail}, Depth: {depth}, Question Density: {density}.

SOURCE TEXT EXCERPT (PAGES {start_p} TO {end_p}):
---
{range_snippet}
---

REQUIREMENTS:
1. summary: High-yield executive overview of this page range (2-3 sentences).
2. markdownStudyNotes: Rich, beautifully structured Markdown notes strictly grounded in the page {start_p}-{end_p} excerpt above:
   - Use ## for main section titles (e.g. "## 1. Core Concepts & Foundations") and ### for sub-sections. Never use raw unformatted numbers for titles.
   - Use standard LaTeX for equations: $$...$$ for display equations and $...$ for inline math variables.
   - Put all ASCII diagrams, trees, or workflows strictly inside ```ascii ... ``` code fences so they render cleanly in monospace.
   - Use bold **Key Terminology** followed by concise definitions or mechanism explanations.
   - Include > [!NOTE] callouts for domain context and > [!TIP] callouts for high-yield exam traps or shortcuts.
   - Keep paragraphs well-spaced and easy to skim.
3. keyFormulasOrTerms: 2-4 core terminology or equations with concise definitions.
4. assessment: Exactly {q_count} multiple-choice questions with 4 options, correctAnswer, and comprehensive explanations.
5. flashcards: 2 active-recall flip flashcards with front (prompt) and back (explanation).

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
    "markdownStudyNotes": "<markdown notes>",
    "keyFormulasOrTerms": [
      {{ "term": "<Term>", "definition": "<Definition>" }}
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
        "explanation": "<Why this answer is correct>"
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
{notes[:3000]}
---

Recent Chat History:
{history_str}

Student Question: "{user_msg}"

INSTRUCTIONS:
- Provide a helpful, pedagogically clear, and encouraging explanation.
- Ground your answer directly in the lesson material.
- Keep the response focused, structured, and easy to review for exams.
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
