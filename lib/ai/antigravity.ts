import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { extractDocumentText } from '@/lib/extractors/document';
import {
  Phase1FileAnalysis,
  Phase2SequencePlan,
  Phase3RangeContent,
  UserStudyPreferences,
} from '@/types/we-study';

const BRIDGE_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'antigravity_bridge.py');

/**
 * Spawns the Antigravity CLI / Python execution bridge with JSON in/out
 */
async function runAntigravityCliBridge<T>(phase: 'phase1' | 'phase2' | 'phase3' | 'chat', payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [BRIDGE_SCRIPT_PATH, '--phase', phase]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Antigravity process exited with code ${code}: ${stderr || stdout}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Antigravity response: ${stdout}`));
      }
    });

    python.stdin.write(JSON.stringify(payload));
    python.stdin.end();
  });
}

/**
 * Phase 1: Antigravity File Analysis (Extracts Page Ranges & Whole-File Summary)
 */
export async function executePhase1WithAntigravity(file: {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt';
  s3: any;
}): Promise<Phase1FileAnalysis> {
  let fileContent = '';
  let targetPath = file.s3?.localPath;

  if (!targetPath && file.s3?.s3Key) {
    targetPath = path.join(process.cwd(), 'uploads', file.s3.s3Key.replace(/\//g, '_'));
  }

  if (targetPath && fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
    const extracted = await extractDocumentText(targetPath, file.fileType);
    fileContent = extracted.text;
  }

  return runAntigravityCliBridge<Phase1FileAnalysis>('phase1', {
    ...file,
    fileContent,
  });
}

/**
 * Phase 2: Antigravity Sequence Planning (Based strictly on file summaries)
 */
export async function executePhase2WithAntigravity(params: {
  sessionId: string;
  userId: string;
  subjectId: string;
  files: Phase1FileAnalysis[];
}): Promise<Phase2SequencePlan> {
  return runAntigravityCliBridge<Phase2SequencePlan>('phase2', params);
}

/**
 * Phase 3: Antigravity Range Content & Quiz Generation (New chat context per range)
 */
export async function executePhase3WithAntigravity(params: {
  sessionId: string;
  file: Phase1FileAnalysis;
  range: { rangeId: string; startPage: number; endPage: number; topicTitle: string };
  preferences: UserStudyPreferences;
  moduleNumber: number;
  lessonNumber: number;
}): Promise<Phase3RangeContent> {
  return runAntigravityCliBridge<Phase3RangeContent>('phase3', params);
}

/**
 * Dedicated Topic AI Tutor with Antigravity
 */
export async function executeTopicChatWithAntigravity(params: {
  topicTitle: string;
  markdownNotes: string;
  userMessage: string;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
}): Promise<string> {
  const result = await runAntigravityCliBridge<{ reply: string }>('chat', params);
  return result.reply;
}
