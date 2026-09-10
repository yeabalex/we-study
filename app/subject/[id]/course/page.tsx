'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CourseMarkdown } from '@/components/markdown/CourseMarkdown';
import { SparkLogo } from '@/components/illustrations/SparkLogo';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Layers,
  Award,
  Send,
  RotateCw,
  X,
  FileText,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CourseraCourseLesson,
  CourseraCourseModule,
  CourseRoadmapDocument,
} from '@/types/we-study';

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id;

  const [course, setCourse] = useState<CourseRoadmapDocument | null>(null);
  const [progress, setProgress] = useState<any>({ completedLessonIds: [], quizAttempts: {} });
  const [selectedLesson, setSelectedLesson] = useState<CourseraCourseLesson | null>(null);
  const [selectedModule, setSelectedModule] = useState<CourseraCourseModule | null>(null);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'flashcards'>('notes');
  const [isLoading, setIsLoading] = useState(true);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Flashcards state
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Topic Chat Drawer state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  useEffect(() => {
    async function loadCourse() {
      try {
        const res = await fetch(`/api/courses/${subjectId}`);
        if (!res.ok) {
          router.push('/dashboard');
          return;
        }
        const data = await res.json();
        setCourse(data.course);
        setProgress(data.progress || { completedLessonIds: [], quizAttempts: {} });

        if (data.course?.modules?.length > 0) {
          const firstMod = data.course.modules[0];
          setSelectedModule(firstMod);
          setExpandedModuleIds([firstMod.moduleId]);
          if (firstMod.lessons?.length > 0) {
            setSelectedLesson(firstMod.lessons[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourse();
  }, [subjectId, router]);

  // Load chat history when selected lesson changes
  useEffect(() => {
    if (!selectedLesson || !course) return;

    const currentCourse = course;
    const currentLesson = selectedLesson;

    // Reset quiz attempt state for new lesson
    setSelectedAnswers({});
    setIsQuizSubmitted(false);
    setQuizScore(null);

    async function loadChat() {
      try {
        const res = await fetch(`/api/chat/lesson?subjectId=${currentCourse.subjectId}&lessonId=${currentLesson.lessonId}`);
        if (res.ok) {
          const data = await res.json();
          setChatMessages(data.chat?.messages || []);
        }
      } catch (err) {
        console.error('Failed to load lesson chat:', err);
      }
    }
    loadChat();
  }, [selectedLesson, course]);

  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSelectLesson = (mod: CourseraCourseModule, lesson: CourseraCourseLesson) => {
    setSelectedModule(mod);
    setSelectedLesson(lesson);
    setActiveTab('notes');
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (isQuizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleQuizSubmit = async () => {
    if (!selectedLesson || !course) return;

    const answersPayload = Object.entries(selectedAnswers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer,
    }));

    try {
      const res = await fetch(`/api/courses/${course._id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: selectedLesson.lessonId,
          answers: answersPayload,
        }),
      });

      const result = await res.json();
      setIsQuizSubmitted(true);
      setQuizScore(result.score);

      // Update progress state
      setProgress((prev: any) => ({
        ...prev,
        completedLessonIds: Array.from(new Set([...prev.completedLessonIds, selectedLesson.lessonId])),
        quizAttempts: {
          ...prev.quizAttempts,
          [selectedLesson.lessonId]: result.attempt,
        },
      }));

      // Celebrate with confetti if scored high!
      if (result.percentage >= 70) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error('Quiz submit failed:', err);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat || !selectedLesson || !selectedModule || !course) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/chat/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: course.subjectId,
          moduleId: selectedModule.moduleId,
          lessonId: selectedLesson.lessonId,
          rangeId: selectedLesson.rangeId,
          topicTitle: selectedLesson.title,
          markdownNotes: selectedLesson.markdownNotes,
          message: userText,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-neutral-900 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Loading Course Curriculum...
          </p>
        </div>
      </div>
    );
  }

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = progress.completedLessonIds?.length || 0;
  const progressPercent = Math.round((completedCount / Math.max(totalLessons, 1)) * 100);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-900 font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-30 h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-neutral-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center">
              <SparkLogo className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="font-extrabold text-sm text-neutral-900 truncate max-w-xs sm:max-w-md">
              {course.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress Bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="text-xs font-bold text-neutral-600">
              {completedCount}/{totalLessons} completed ({progressPercent}%)
            </div>
            <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* AI Tutor Chat Trigger */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ask Antigravity Tutor</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. COURSERA-STYLE LEFT SIDEBAR (SYLLABUS & MODULE ACCORDIONS) */}
        {/* ========================================================================= */}
        <aside className="w-80 bg-white border-r border-neutral-200/80 flex flex-col flex-shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-4 border-b border-neutral-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Course Syllabus</h2>
            <div className="text-xs text-neutral-600 font-medium">
              Sequenced by Antigravity based on document summaries
            </div>
          </div>

          <div className="p-3 space-y-3 flex-1">
            {course.modules.map((mod) => {
              const isExpanded = expandedModuleIds.includes(mod.moduleId);
              const isModuleActive = selectedModule?.moduleId === mod.moduleId;

              return (
                <div key={mod.moduleId} className="rounded-2xl border border-neutral-200/70 overflow-hidden bg-neutral-50/40">
                  {/* Module Accordion Header */}
                  <button
                    onClick={() => toggleModuleAccordion(mod.moduleId)}
                    className={`w-full p-3.5 text-left flex items-start justify-between transition-colors ${
                      isModuleActive ? 'bg-neutral-100/80' : 'hover:bg-neutral-100/50'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Module {mod.moduleNumber}
                      </div>
                      <div className="font-bold text-xs text-neutral-900 leading-snug mt-0.5">
                        {mod.fileName}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-1" />
                    )}
                  </button>

                  {/* Lessons List under Module */}
                  {isExpanded && (
                    <div className="p-1 space-y-1 bg-white border-t border-neutral-100">
                      {mod.lessons.map((lesson) => {
                        const isLessonSelected = selectedLesson?.lessonId === lesson.lessonId;
                        const isCompleted = progress.completedLessonIds?.includes(lesson.lessonId);
                        const quizAttempt = progress.quizAttempts?.[lesson.lessonId];

                        return (
                          <button
                            key={lesson.lessonId}
                            onClick={() => handleSelectLesson(mod, lesson)}
                            className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                              isLessonSelected
                                ? 'bg-neutral-900 text-white font-bold shadow-sm'
                                : 'text-neutral-700 hover:bg-neutral-100 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isCompleted ? (
                                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isLessonSelected ? 'text-amber-400' : 'text-emerald-600'}`} />
                              ) : (
                                <div className={`w-4 h-4 rounded-full border flex-shrink-0 ${isLessonSelected ? 'border-neutral-500' : 'border-neutral-300'}`} />
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </div>

                            {quizAttempt && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isLessonSelected
                                    ? 'bg-neutral-800 text-amber-300'
                                    : 'bg-neutral-100 text-neutral-700'
                                }`}
                              >
                                {quizAttempt.score}/{quizAttempt.maxScore}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 2. MAIN LESSON VIEWPORT (STUDY NOTES, QUIZZES, FLASHCARDS) */}
        {/* ========================================================================= */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 max-w-4xl mx-auto space-y-6">
          {selectedLesson ? (
            <>
              {/* Lesson Top Header */}
              <div className="space-y-2 border-b border-neutral-200/80 pb-6">
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                  <span>{selectedModule?.fileName}</span>
                  <span>&bull;</span>
                  <span className="font-bold text-neutral-800">
                    Pages {selectedLesson.pageRange.startPage} - {selectedLesson.pageRange.endPage}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  {selectedLesson.title}
                </h1>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 pt-4">
                  {[
                    { id: 'notes', label: 'Study Notes & Concepts', icon: BookOpen },
                    { id: 'quiz', label: `Practice Quiz (${selectedLesson.quiz.length} Qs)`, icon: Award },
                    { id: 'flashcards', label: `Flashcards (${selectedLesson.flashcards?.length || 2})`, icon: Layers },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                          isActive
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB 1: STUDY NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* High-yield summary box */}
                  <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-1 shadow-sm">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Executive Overview</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{selectedLesson.summary}</p>
                  </div>

                  {/* Formatted Markdown Notes */}
                  <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-sm">
                    <CourseMarkdown content={selectedLesson.markdownNotes} />
                  </div>

                  {/* Key Terms Glossary */}
                  {selectedLesson.keyTerms && selectedLesson.keyTerms.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 space-y-3 shadow-sm">
                      <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-wider">
                        Core Vocabulary & Formulas
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedLesson.keyTerms.map((term, i) => (
                          <div key={i} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/60">
                            <div className="font-bold text-xs text-neutral-900">{term.term}</div>
                            <div className="text-xs text-neutral-500 mt-1">{term.definition}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Step CTA */}
                  <div className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-3xl text-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">Ready to test your understanding?</div>
                      <div className="text-xs text-neutral-300">
                        Take the {selectedLesson.quiz.length}-question practice quiz for this page range.
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl shadow transition-all"
                    >
                      Start Quiz
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERACTIVE PRACTICE QUIZ */}
              {activeTab === 'quiz' && (
                <div className="space-y-6 animate-fadeIn">
                  {selectedLesson.quiz.map((q, qIdx) => {
                    const selected = selectedAnswers[q.questionId];

                    return (
                      <div key={q.questionId} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                            Question {qIdx + 1}
                          </span>
                          {isQuizSubmitted && (
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                selected === q.correctAnswer
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {selected === q.correctAnswer ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-neutral-900">{q.question}</h3>

                        {/* Options */}
                        <div className="space-y-2.5 pt-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isChosen = selected === opt;
                            let style = 'border-neutral-200/80 bg-neutral-50/50 hover:border-neutral-300 text-neutral-800';

                            if (isQuizSubmitted) {
                              if (opt === q.correctAnswer) {
                                style = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                              } else if (isChosen && opt !== q.correctAnswer) {
                                style = 'border-rose-500 bg-rose-50 text-rose-950 line-through';
                              }
                            } else if (isChosen) {
                              style = 'border-neutral-900 bg-neutral-900 text-white font-bold shadow-sm';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleAnswerSelect(q.questionId, opt)}
                                className={`w-full p-4 rounded-2xl border-2 text-left text-xs transition-all flex items-center justify-between ${style}`}
                              >
                                <span>{opt}</span>
                                {isQuizSubmitted && opt === q.correctAnswer && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation after submission */}
                        {isQuizSubmitted && (
                          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 space-y-1">
                            <span className="font-bold text-neutral-900">Explanation:</span>
                            <p>{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Submit Button & Score Summary */}
                  <div className="pt-2 flex items-center justify-between">
                    {isQuizSubmitted ? (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
                        <Award className="w-6 h-6 text-emerald-600" />
                        <div>
                          <div className="font-bold text-sm">
                            Quiz Score: {quizScore} / {selectedLesson.quiz.length} (
                            {Math.round(((quizScore || 0) / selectedLesson.quiz.length) * 100)}%)
                          </div>
                          <div className="text-xs text-emerald-800">Progress updated and saved to MongoDB!</div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={Object.keys(selectedAnswers).length === 0}
                        onClick={handleQuizSubmit}
                        className="px-8 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                      >
                        Submit Answers & Grade
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 3D FLIP FLASHCARDS */}
              {activeTab === 'flashcards' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-xs text-neutral-500 font-medium">
                    Click any flashcard to flip and reveal the answer.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(selectedLesson.flashcards || []).map((card) => {
                      const isFlipped = flippedCards[card.cardId];

                      return (
                        <div
                          key={card.cardId}
                          onClick={() =>
                            setFlippedCards((prev) => ({ ...prev, [card.cardId]: !prev[card.cardId] }))
                          }
                          className={`min-h-[180px] p-6 rounded-3xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between select-none ${
                            isFlipped
                              ? 'border-purple-600 bg-purple-50/50 shadow-md scale-[1.01]'
                              : 'border-neutral-200 bg-white hover:border-neutral-300 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                            <span>{isFlipped ? 'Answer' : 'Question / Term'}</span>
                            <RotateCw className="w-3.5 h-3.5" />
                          </div>

                          <div className="my-auto font-bold text-sm text-neutral-900 text-center">
                            {isFlipped ? card.back : card.front}
                          </div>

                          <div className="text-[10px] text-center text-neutral-400 font-medium">
                            {isFlipped ? 'Click to see prompt' : 'Click to flip'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-neutral-400">Select a lesson from the syllabus</div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. DEDICATED LESSON TOPIC CHAT DRAWER (GROUNDED IN LESSON NOTES) */}
      {/* ========================================================================= */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-slideLeft">
          {/* Drawer Header */}
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-900 text-white">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <SparkLogo className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-xs">Antigravity AI Tutor</div>
                <div className="text-[10px] text-neutral-400 truncate max-w-[220px]">
                  Grounded in: {selectedLesson?.title}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F9FAFB]">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12 space-y-3 text-neutral-400">
                <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-600 shadow-sm">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-neutral-700">Dedicated Topic Tutor</div>
                <p className="text-[11px] text-neutral-400 max-w-[260px] mx-auto leading-relaxed">
                  Ask any question regarding pages {selectedLesson?.pageRange.startPage}-{selectedLesson?.pageRange.endPage}. The tutor is strictly grounded in these study notes.
                </p>

                {/* Quick Prompts */}
                <div className="space-y-1.5 pt-2">
                  {[
                    'Explain the primary mechanism with a simple analogy.',
                    'What is the common exam trap for this topic?',
                    'Generate an extra difficult practice question.',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setChatInput(preset);
                      }}
                      className="w-full text-left text-[11px] font-medium p-2.5 rounded-xl bg-white border border-neutral-200/80 hover:border-neutral-400 text-neutral-700 transition-all shadow-2xs"
                    >
                      &ldquo;{preset}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-neutral-900 text-white rounded-br-none font-medium'
                        : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <CourseMarkdown content={msg.content} />
                    )}
                  </div>
                </div>
              ))
            )}
            {isSendingChat && (
              <div className="flex justify-start">
                <div className="bg-white border border-neutral-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin" />
                  <span className="text-[11px] text-neutral-500 font-medium">Antigravity is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChatMessage} className="p-3 border-t border-neutral-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about this lesson..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:border-neutral-900 outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-sm disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
