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

AGY_BINARY = "/Users/yabsera/.local/bin/agy"

def clean_json_response(raw_text):
    """Strips markdown fences or preamble from CLI text output to extract valid JSON"""
    text = raw_text.strip()
    
    # Check if inside markdown block ```json ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()
    else:
        # Find first { and last }
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            text = text[first_brace:last_brace + 1]
            
    return text

def call_antigravity_cli(prompt):
    """Executes the prompt directly through Antigravity CLI"""
    if not os.path.exists(AGY_BINARY):
        raise RuntimeError(f"Antigravity CLI binary not found at {AGY_BINARY}")

    cmd = [
        AGY_BINARY,
        "--print",
        prompt,
        "--output-format",
        "text",
        "--dangerously-skip-permissions"
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=180
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Antigravity CLI exited with code {result.returncode}:\nStdout: {result.stdout}\nStderr: {result.stderr}"
        )

    output = result.stdout.strip()
    if not output:
        raise RuntimeError("Antigravity CLI returned empty output")

    return output

def run_phase1(payload):
    """Phase 1: Real Document Analysis & Page Range Extraction using Antigravity CLI"""
    file_id = payload.get("fileId", "file_01")
    file_name = payload.get("fileName", "Document.pdf")
    file_type = payload.get("fileType", "pdf")
    raw_content = payload.get("fileContent", "")
    
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
    cleaned = clean_json_response(raw_response)
    data = json.loads(cleaned)
    data["fileId"] = file_id
    data["fileName"] = file_name
    data["fileType"] = file_type
    data["s3"] = payload.get("s3", {})
    return data

def run_phase2(payload):
    """Phase 2: Real Sequence Planning Based Strictly on Summaries using Antigravity CLI"""
    files = payload.get("files", [])
    summaries_text = "\n".join(
        [f"{i+1}. [File ID: {f.get('fileId')}] \"{f.get('fileName')}\": {f.get('fileSummary')}" for i, f in enumerate(files)]
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
  "sessionId": "{payload.get('sessionId')}",
  "userId": "{payload.get('userId')}",
  "subjectId": "{payload.get('subjectId')}",
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
    cleaned = clean_json_response(raw_response)
    return json.loads(cleaned)

def run_phase3(payload):
    """Phase 3: Real Study Notes & Quiz Generation in New Context using Antigravity CLI"""
    file_info = payload.get("file", {})
    range_info = payload.get("range", {})
    prefs = payload.get("preferences", {})

    topic_title = range_info.get("topicTitle", "Lesson")
    start_p = range_info.get("startPage", 1)
    end_p = range_info.get("endPage", 5)

    density = prefs.get("questionDensity", "high")
    q_count = 4 if density == "high" else (2 if density == "medium" else 1)
    
    depth = prefs.get("subjectContext", {}).get("targetDepth", "solid_understanding")
    exam_type = prefs.get("subjectContext", {}).get("targetExamType", "final_exam")
    time_avail = prefs.get("subjectContext", {}).get("timeAvailable", "1_to_2_weeks")

    prompt = f"""
You are an expert academic professor and exam tutor for WeStudy.
Generate a comprehensive, Coursera-style study lesson for:
- Document: "{file_info.get('fileName')}"
- Topic: "{topic_title}" (Pages {start_p} to {end_p})
- Student Context: Target Exam: {exam_type}, Time Available: {time_avail}, Depth: {depth}, Question Density: {density}.

REQUIREMENTS:
1. summary: High-yield executive overview of this page range (2-3 sentences).
2. markdownStudyNotes: Rich, beautifully formatted Markdown notes with:
   - Clear ## and ### headers
   - Step-by-step conceptual mechanisms
   - Formulas / ASCII diagrams / Key principles
   - > [!NOTE] and > [!TIP] callouts for common exam traps and high-yield memory aids
3. keyFormulasOrTerms: 2-4 core terminology or equations with concise definitions.
4. assessment: Exactly {q_count} multiple-choice questions with 4 options, correctAnswer, and comprehensive explanations.
5. flashcards: 2 active-recall flip flashcards with front (prompt) and back (explanation).

Return strictly a single valid JSON object without any other text:
{{
  "rangeId": "{range_info.get('rangeId')}",
  "fileId": "{file_info.get('fileId')}",
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
        "questionId": "q_{range_info.get('rangeId')}_1",
        "type": "multiple_choice",
        "question": "<Question text>",
        "options": ["<Option A>", "<Option B>", "<Option C>", "<Option D>"],
        "correctAnswer": "<Option A>",
        "explanation": "<Why this answer is correct>"
      }}
    ],
    "flashcards": [
      {{ "cardId": "fc_{range_info.get('rangeId')}_1", "front": "<Front>", "back": "<Back>" }}
    ]
  }}
}}
"""

    raw_response = call_antigravity_cli(prompt)
    cleaned = clean_json_response(raw_response)
    return json.loads(cleaned)

def run_chat(payload):
    """Dedicated Lesson Tutor Chat with Antigravity CLI"""
    topic_title = payload.get("topicTitle", "Lesson")
    notes = payload.get("markdownNotes", "")
    user_msg = payload.get("userMessage", "")
    history = payload.get("chatHistory", [])

    history_str = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in history[-6:]])

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

    input_data = json.load(sys.stdin)

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
