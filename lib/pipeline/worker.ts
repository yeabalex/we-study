import { db } from '@/lib/db/mongodb';
import { sessionCache } from '@/lib/db/redis';
import {
  executePhase1WithAntigravity,
  executePhase2WithAntigravity,
  executePhase3WithAntigravity,
} from '@/lib/ai/antigravity';
import {
  CourseraCourseModule,
  CourseRoadmapDocument,
  GenerationSessionState,
  Phase1FileAnalysis,
  UserStudyPreferences,
} from '@/types/we-study';

export interface StartPipelineJobParams {
  sessionId: string;
  userId: string;
  subjectId: string;
  subjectTitle: string;
  files: {
    fileId: string;
    fileName: string;
    fileType: 'pdf' | 'docx' | 'pptx' | 'txt';
    s3: any;
    fileSize: number;
  }[];
  preferences: UserStudyPreferences;
}

/**
 * Executes the complete multi-phase background generation pipeline
 */
export async function runGenerationPipeline(params: StartPipelineJobParams): Promise<void> {
  const { sessionId, userId, subjectId, subjectTitle, files, preferences } = params;

  try {
    // -----------------------------------------------------------------------------------
    // STEP 1: INITIALIZE SESSION STATE IN REDIS
    // -----------------------------------------------------------------------------------
    let state: GenerationSessionState = {
      sessionId,
      userId,
      subjectId,
      stage: 'phase1_processing',
      progressPercentage: 10,
      currentStepMessage: `Phase 1: Analyzing ${files.length} document(s) & extracting topic page ranges...`,
      processedFilesCount: 0,
      totalFilesCount: files.length,
      processedRangesCount: 0,
      totalRangesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await sessionCache.setSessionState(sessionId, state);

    // -----------------------------------------------------------------------------------
    // STEP 2: PHASE 1 - PER-FILE ANALYSIS (PAGE RANGES & WHOLE-FILE SUMMARY)
    // -----------------------------------------------------------------------------------
    const phase1Results: Phase1FileAnalysis[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      state = {
        ...state,
        currentStepMessage: `Phase 1: Analyzing "${file.fileName}" (${i + 1} of ${files.length})...`,
        progressPercentage: 10 + Math.floor(((i + 1) / files.length) * 25),
        processedFilesCount: i,
        updatedAt: new Date().toISOString(),
      };
      await sessionCache.setSessionState(sessionId, state);

      const analysis = await executePhase1WithAntigravity(file);
      await sessionCache.savePhase1File(sessionId, file.fileId, analysis);
      phase1Results.push(analysis);
    }

    const totalRanges = phase1Results.reduce((acc, f) => acc + f.pageRanges.length, 0);

    // -----------------------------------------------------------------------------------
    // STEP 3: PHASE 2 - SEQUENCE PLANNING (BASED STRICTLY ON FILE SUMMARIES)
    // -----------------------------------------------------------------------------------
    state = {
      ...state,
      stage: 'phase2_sequencing',
      progressPercentage: 40,
      currentStepMessage: 'Phase 2: Sequencing curriculum roadmap with Antigravity based on file summaries...',
      processedFilesCount: files.length,
      totalRangesCount: totalRanges,
      updatedAt: new Date().toISOString(),
    };
    await sessionCache.setSessionState(sessionId, state);

    const sequencePlan = await executePhase2WithAntigravity({
      sessionId,
      userId,
      subjectId,
      files: phase1Results,
    });
    await sessionCache.savePhase2Sequence(sessionId, sequencePlan);

    // -----------------------------------------------------------------------------------
    // STEP 4: PHASE 3 - CONTENT & ASSESSMENT GENERATION (PER RANGE IN NEW CHAT CONTEXT)
    // -----------------------------------------------------------------------------------
    state = {
      ...state,
      stage: 'phase3_generating',
      progressPercentage: 50,
      currentStepMessage: `Phase 3: Generating study notes & practice quizzes for ${totalRanges} lessons with Antigravity...`,
      updatedAt: new Date().toISOString(),
    };
    await sessionCache.setSessionState(sessionId, state);

    // Map file analyses by fileId for quick lookup
    const fileMap = new Map<string, Phase1FileAnalysis>();
    for (const f of phase1Results) {
      fileMap.set(f.fileId, f);
    }

    const courseModules: CourseraCourseModule[] = [];
    let completedRangesCount = 0;

    for (let mIdx = 0; mIdx < sequencePlan.orderedFiles.length; mIdx++) {
      const seqFile = sequencePlan.orderedFiles[mIdx];
      const fileData = fileMap.get(seqFile.fileId);

      if (!fileData) continue;

      const lessons = [];

      for (let rIdx = 0; rIdx < fileData.pageRanges.length; rIdx++) {
        const range = fileData.pageRanges[rIdx];

        state = {
          ...state,
          progressPercentage: 50 + Math.floor(((completedRangesCount + 1) / totalRanges) * 45),
          currentStepMessage: `Phase 3: Antigravity crafting Lesson ${completedRangesCount + 1} of ${totalRanges} ("${range.topicTitle}")...`,
          processedRangesCount: completedRangesCount,
          updatedAt: new Date().toISOString(),
        };
        await sessionCache.setSessionState(sessionId, state);

        // Generate content per range using a new chat context
        const rangeContent = await executePhase3WithAntigravity({
          sessionId,
          file: fileData,
          range,
          preferences,
          moduleNumber: mIdx + 1,
          lessonNumber: rIdx + 1,
        });

        await sessionCache.savePhase3Range(sessionId, fileData.fileId, range.rangeId, rangeContent);

        lessons.push({
          lessonId: `les_${mIdx + 1}_${rIdx + 1}`,
          lessonNumber: rIdx + 1,
          rangeId: range.rangeId,
          title: range.topicTitle,
          pageRange: rangeContent.pageRange,
          summary: rangeContent.content.summary,
          markdownNotes: rangeContent.content.markdownStudyNotes,
          keyTerms: rangeContent.content.keyFormulasOrTerms,
          quiz: rangeContent.assessment.questions,
          flashcards: rangeContent.assessment.flashcards,
        });

        completedRangesCount++;
      }

      courseModules.push({
        moduleId: `mod_${mIdx + 1}`,
        moduleNumber: mIdx + 1,
        fileId: seqFile.fileId,
        fileName: seqFile.fileName,
        moduleTitle: `Module ${mIdx + 1}: ${seqFile.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')}`,
        moduleSummary: seqFile.fileSummary,
        pedagogicalRationale: seqFile.pedagogicalRationale,
        lessons,
      });
    }

    // -----------------------------------------------------------------------------------
    // STEP 5: SAVE AGGREGATED COURSERA COURSE IN MONGODB & FINALIZE SESSION
    // -----------------------------------------------------------------------------------
    const courseDocument: CourseRoadmapDocument = {
      _id: `course_${subjectId}`,
      subjectId,
      userId,
      title: subjectTitle,
      description: `Structured curriculum synthesized from ${files.length} document(s) into ${courseModules.length} modules and ${completedRangesCount} lessons.`,
      preferencesUsed: preferences,
      modules: courseModules,
      totalLessons: completedRangesCount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.saveCourse(courseDocument);

    // Update subject status to ready in MongoDB
    await db.saveSubject({
      _id: subjectId,
      userId,
      title: subjectTitle,
      fileCount: files.length,
      status: 'ready',
      courseId: courseDocument._id,
      preferences,
      updatedAt: new Date(),
    });

    // Mark session completed in Redis for 3-second polling
    state = {
      ...state,
      stage: 'completed',
      progressPercentage: 100,
      currentStepMessage: 'Curriculum generated successfully! Preparing your interactive course...',
      processedRangesCount: completedRangesCount,
      updatedAt: new Date().toISOString(),
    };
    await sessionCache.setSessionState(sessionId, state);
  } catch (error: any) {
    console.error('Background generation pipeline failed:', error);
    const failedState: GenerationSessionState = {
      sessionId,
      userId,
      subjectId,
      stage: 'failed',
      progressPercentage: 100,
      currentStepMessage: 'Generation encountered an error',
      error: error.message || 'Unknown processing error',
      processedFilesCount: 0,
      totalFilesCount: files.length,
      processedRangesCount: 0,
      totalRangesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await sessionCache.setSessionState(sessionId, failedState);
  }
}
