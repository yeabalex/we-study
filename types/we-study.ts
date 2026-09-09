/**
 * WeStudy Type Definitions
 * Shared across Next.js API routes, background workers, Redis session cache, and MongoDB models.
 */

// 1. User Learning Style & Onboarding Profile
export interface OnboardingProfile {
  learningStyle: 'visual_diagrams' | 'active_practice_quizzes' | 'deep_conceptual' | 'high_yield_bullets';
  primaryGoal: 'ace_exams' | 'pass_with_minimal_time' | 'deep_mastery' | 'certification';
  preferredPace: 'cram' | 'moderate' | 'deep_dive';
  questionDensity: 'high' | 'medium' | 'low'; // high = quiz per every range
  wantsFlashcards: boolean;
  studyReminderTime?: string;
  completedAt?: Date;
}

// Subject Specific Context (Asked before creating each study subject)
export interface SubjectPreparationContext {
  targetExamType: 'final_exam' | 'midterm' | 'quiz_prep' | 'certification' | 'general_course_study';
  timeAvailable: 'less_than_24h' | '1_to_3_days' | '1_to_2_weeks' | '1_month_plus';
  targetDepth: 'pass_high_yield' | 'solid_understanding' | 'complete_mastery';
  customInstructions?: string;
}

export interface UserStudyPreferences extends OnboardingProfile {
  subjectContext?: SubjectPreparationContext;
}

// 2. Phase 1: File Parsing & Page Range Mapping (Redis Key: `session:{sessionId}:file:{fileId}`)
export interface PageRangeTopic {
  rangeId: string;
  startPage: number;
  endPage: number;
  topicTitle: string;
}

export interface S3FileMetadata {
  s3Key: string; // e.g. "users/{userId}/subjects/{subjectId}/sessions/{sessionId}/files/{fileId}/{fileName}"
  s3Bucket: string;
  s3Url?: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface Phase1FileAnalysis {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt';
  s3: S3FileMetadata; // S3 storage reference for download by background workers
  fileSummary: string; // Concise summary of what the entire file covers
  totalPages: number;
  pageRanges: PageRangeTopic[];
}

// 3. Phase 2: Sequence Planning (Redis Key: `session:{sessionId}:sequence`)
export interface Phase2SequencedFile {
  sequenceOrder: number; // 1, 2, 3...
  fileId: string;
  fileName: string;
  fileSummary: string;
  pedagogicalRationale: string; // Why this file is placed here in the study order
}

export interface Phase2SequencePlan {
  sessionId: string;
  userId: string;
  subjectId: string;
  totalFiles: number;
  orderedFiles: Phase2SequencedFile[];
}

// 4. Assessment Models (Quiz & Flashcards)
export interface QuizQuestion {
  questionId: string;
  type: 'multiple_choice' | 'true_false' | 'conceptual_short';
  question: string;
  options?: string[]; // for MCQ
  correctAnswer: string;
  explanation: string;
}

export interface Flashcard {
  cardId: string;
  front: string;
  back: string;
}

// 5. Phase 3: Content Per Page Range (Redis Key: `session:{sessionId}:content:{fileId}:{rangeId}`)
export interface Phase3RangeContent {
  rangeId: string;
  fileId: string;
  topicTitle: string;
  pageRange: {
    startPage: number;
    endPage: number;
  };
  content: {
    summary: string;
    markdownStudyNotes: string; // Rich formatted markdown
    keyFormulasOrTerms?: { term: string; definition: string }[];
  };
  assessment: {
    questions: QuizQuestion[];
    flashcards?: Flashcard[];
  };
}

// 6. Redis Pipeline Session State (Polling & Progress Tracking)
export type SessionStage =
  | 'uploading'
  | 'phase1_processing' // Extracting page ranges & file summaries
  | 'phase2_sequencing' // Sequencing files based on summaries
  | 'phase3_generating' // Generating study notes & quizzes per range
  | 'completed'
  | 'failed';

export interface GenerationSessionState {
  sessionId: string;
  userId: string;
  subjectId: string;
  stage: SessionStage;
  progressPercentage: number; // 0 - 100
  currentStepMessage: string;
  processedFilesCount: number;
  totalFilesCount: number;
  processedRangesCount: number;
  totalRangesCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// 7. MongoDB Permanent Models: Coursera-Style Course Presentation
export interface CourseraCourseLesson {
  lessonId: string;
  lessonNumber: number;
  rangeId: string;
  title: string;
  pageRange: {
    startPage: number;
    endPage: number;
  };
  summary: string;
  markdownNotes: string;
  keyTerms?: { term: string; definition: string }[];
  quiz: QuizQuestion[];
  flashcards?: Flashcard[];
  isCompleted?: boolean;
}

export interface CourseraCourseModule {
  moduleId: string;
  moduleNumber: number;
  fileId: string;
  fileName: string;
  moduleTitle: string;
  moduleSummary: string;
  pedagogicalRationale: string;
  lessons: CourseraCourseLesson[];
}

export interface CourseRoadmapDocument {
  _id: string;
  subjectId: string;
  userId: string;
  title: string;
  description: string;
  preferencesUsed: UserStudyPreferences;
  modules: CourseraCourseModule[];
  totalLessons: number;
  createdAt: Date;
  updatedAt: Date;
}

// 8. Dedicated Topic Chat (MongoDB: `TopicChat` Collection)
export interface TopicChatMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface TopicChatDocument {
  _id: string;
  subjectId: string;
  moduleId: string;
  lessonId: string;
  rangeId: string;
  userId: string;
  messages: TopicChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// 9. User Progress & Quiz Submissions (MongoDB: `UserProgress` Collection)
export interface QuizAttempt {
  lessonId: string;
  answers: { questionId: string; selectedAnswer: string; isCorrect: boolean }[];
  score: number;
  maxScore: number;
  completedAt: Date;
}

export interface UserProgressDocument {
  _id: string;
  userId: string;
  subjectId: string;
  completedLessonIds: string[];
  quizAttempts: Record<string, QuizAttempt>; // Keyed by lessonId
  lastAccessedLessonId?: string;
  overallScorePercentage: number;
  updatedAt: Date;
}
