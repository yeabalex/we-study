'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SparkLogo } from '@/components/illustrations/SparkLogo';
import { CreateSubjectModal } from '@/components/subject/CreateSubjectModal';
import {
  Plus,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  LogOut,
  ChevronRight,
  Layers,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.user);

        const subRes = await fetch('/api/subjects');
        const subData = await subRes.json();
        setSubjects(subData.subjects || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/subjects/${subjectToDelete._id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSubjects((prev) => prev.filter((s) => s._id !== subjectToDelete._id));
        setSubjectToDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete subject');
      }
    } catch (err) {
      console.error('Delete subject error:', err);
      alert('An error occurred while deleting the subject');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-neutral-900 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Loading WeStudy Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans text-neutral-900">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <SparkLogo className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-extrabold text-neutral-900 text-lg tracking-tight">we-study</span>
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                Antigravity AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-neutral-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-neutral-900">{user?.name || 'Student'}</div>
                <div className="text-[10px] text-neutral-400">{user?.email}</div>
              </div>
              <img
                src={user?.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
              />
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="z-10 space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tailored to your {user?.preferences?.learningStyle ? user.preferences.learningStyle.replace(/_/g, ' ') : 'active practice'} style</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready for exam mastery, {user?.name?.split(' ')[0] || 'Student'}?
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Upload your lecture slides and textbooks. Antigravity will sequence the curriculum and generate customized quizzes per page range.
            </p>
          </div>

          <div className="z-10 flex-shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99]"
            >
              <Plus className="w-5 h-5" />
              <span>Create Study Subject</span>
            </button>
          </div>

          {/* Decorative Background Circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Subjects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Your Study Subjects</h2>
              <p className="text-xs text-neutral-500">Structured Coursera-style roadmaps generated by Antigravity</p>
            </div>
            {subjects.length > 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-bold text-neutral-900 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>New Subject</span>
              </button>
            )}
          </div>

          {subjects.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-100/60 text-amber-800 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">No study subjects yet</h3>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
                Create your first study subject and upload lecture slides or PDFs to generate your personalized study course.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                + Create First Study Subject
              </button>
            </div>
          ) : (
            /* Subjects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub) => (
                <div
                  key={sub._id}
                  onClick={() => router.push(`/subject/${sub._id}/course`)}
                  className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                        {sub.subjectContext?.targetExamType ? sub.subjectContext.targetExamType.replace(/_/g, ' ') : 'Final Exam'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSubjectToDelete(sub);
                          }}
                          title="Delete subject & files"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-lg text-neutral-900 group-hover:text-amber-600 transition-colors">
                      {sub.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{sub.fileCount || 1} Document(s)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{sub.subjectContext?.timeAvailable ? sub.subjectContext.timeAvailable.replace(/_/g, ' ') : '1-2 Weeks'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-neutral-100 flex items-center justify-between mt-4">
                    <span className="text-xs font-bold text-neutral-700">Study Curriculum</span>
                    <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Subject Modal */}
      <CreateSubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userDefaultPreferences={user?.preferences}
      />

      {/* Delete Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setSubjectToDelete(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                Delete Study Subject?
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-neutral-900">&ldquo;{subjectToDelete.title}&rdquo;</span>?
              </p>
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-900 text-xs leading-relaxed space-y-1">
                <div className="font-bold">This action cannot be undone:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-red-800">
                  <li>Generated curriculum, notes, and practice quizzes</li>
                  <li>All uploaded files & documents stored on disk</li>
                  <li>Your quiz progress and AI tutor conversation history</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubject}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Subject & Files</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
