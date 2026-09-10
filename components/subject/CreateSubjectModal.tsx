'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  UploadCloud,
  FileText,
  Clock,
  Target,
  Sparkles,
  Layers,
  CheckCircle2,
  Trash2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDefaultPreferences?: any;
}

interface UploadedFileItem {
  fileId: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt';
  fileSize: number;
  s3: any;
  uploading?: boolean;
}

export function CreateSubjectModal({ isOpen, onClose, userDefaultPreferences }: CreateSubjectModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectId, setSubjectId] = useState(() => `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const [sessionId, setSessionId] = useState(() => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  // Step 1: Subject info & preparation context
  const [title, setTitle] = useState('');
  const [targetExamType, setTargetExamType] = useState<'final_exam' | 'midterm' | 'quiz_prep' | 'certification' | 'general_course_study'>('final_exam');
  const [timeAvailable, setTimeAvailable] = useState<'less_than_24h' | '1_to_3_days' | '1_to_2_weeks' | '1_month_plus'>('1_to_2_weeks');
  const [targetDepth, setTargetDepth] = useState<'pass_high_yield' | 'solid_understanding' | 'complete_mastery'>('solid_understanding');
  const [questionDensity, setQuestionDensity] = useState<'high' | 'medium' | 'low'>(
    userDefaultPreferences?.questionDensity || 'high'
  );

  // Step 2: Uploaded files
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleClose = () => {
    setTitle('');
    setFiles([]);
    setStep(1);
    setIsSubmitting(false);
    setSubjectId(`sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    setSessionId(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    onClose();
  };

  if (!isOpen) return null;

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileId = `file_${Date.now()}_${i}`;
      const ext = file.name.split('.').pop()?.toLowerCase();
      let fileType: 'pdf' | 'docx' | 'pptx' | 'txt' = 'pdf';
      if (ext === 'docx' || ext === 'doc') fileType = 'docx';
      else if (ext === 'pptx' || ext === 'ppt') fileType = 'pptx';
      else if (ext === 'txt') fileType = 'txt';

      const item: UploadedFileItem = {
        fileId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        s3: {},
        uploading: true,
      };

      setFiles((prev) => [...prev, item]);

      try {
        // Direct local file upload via FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subjectId', subjectId);
        formData.append('sessionId', sessionId);
        formData.append('fileId', fileId);

        const uploadRes = await fetch('/api/upload/local', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Local upload failed');
        }

        const uploadData = await uploadRes.json();

        item.s3 = {
          localPath: uploadData.localPath,
          relativePath: uploadData.relativePath,
          mimeType: file.type,
          fileSizeBytes: file.size,
        };
        item.uploading = false;

        setFiles((prev) => prev.map((f) => (f.fileId === fileId ? { ...item } : f)));
      } catch (err) {
        console.error('File upload error:', err);
        setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  };

  const handleStartGeneration = async () => {
    if (!title.trim() || files.length === 0) return;
    setIsSubmitting(true);

    const preferences = {
      ...(userDefaultPreferences || {}),
      questionDensity,
      wantsFlashcards: true,
      subjectContext: {
        targetExamType,
        timeAvailable,
        targetDepth,
      },
    };

    try {
      const res = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          subjectTitle: title.trim(),
          files: files.map((f) => ({
            fileId: f.fileId,
            fileName: f.fileName,
            fileType: f.fileType,
            fileSize: f.fileSize,
            s3: f.s3,
          })),
          preferences,
        }),
      });

      const data = await res.json();
      if (data.sessionId) {
        router.push(`/subject/${subjectId}/generating?sessionId=${data.sessionId}`);
      } else {
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Failed to trigger generation:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                Antigravity AI
              </span>
              <span className="text-xs text-neutral-400">Step {step} of 2</span>
            </div>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-1">
              {step === 1 ? 'New Study Subject & Exam Context' : 'Upload Course Materials'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* STEP 1: CONTEXT & GOALS */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Subject Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Subject / Course Name *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Biochemistry Final Exam, CS Algorithms, Organic Chem..."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none text-neutral-900 text-sm font-medium"
                />
              </div>

              {/* Exam / Goal Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  What are you preparing for?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'final_exam', label: 'Final Exam' },
                    { id: 'midterm', label: 'Midterm Exam' },
                    { id: 'quiz_prep', label: 'Weekly Quiz' },
                    { id: 'certification', label: 'Certification' },
                    { id: 'general_course_study', label: 'General Mastery' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetExamType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        targetExamType === t.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Available */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  How much time do you have before the exam?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'less_than_24h', label: '< 24 Hours', sub: 'Cram mode' },
                    { id: '1_to_3_days', label: '1 - 3 Days', sub: 'High-yield focus' },
                    { id: '1_to_2_weeks', label: '1 - 2 Weeks', sub: 'Balanced study' },
                    { id: '1_month_plus', label: '1 Month+', sub: 'Comprehensive' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimeAvailable(t.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        timeAvailable === t.id
                          ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className={`text-[10px] ${timeAvailable === t.id ? 'text-orange-100' : 'text-neutral-400'}`}>
                        {t.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Depth */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Target Depth & Detail Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pass_high_yield', title: 'Pass & High-Yield', desc: 'Core essential concepts only' },
                    { id: 'solid_understanding', title: 'Solid B+ / A', desc: 'Balanced concepts & quizzes' },
                    { id: 'complete_mastery', title: 'Complete Mastery', desc: 'Deep dive & all edge cases' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setTargetDepth(d.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        targetDepth === d.id
                          ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{d.title}</div>
                      <div className={`text-[10px] mt-0.5 ${targetDepth === d.id ? 'text-purple-200' : 'text-neutral-500'}`}>
                        {d.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Density */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Question Density (For this subject)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'high', label: 'High (Every Range)' },
                    { id: 'medium', label: 'Balanced' },
                    { id: 'low', label: 'Summary Only' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuestionDensity(q.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        questionDensity === q.id
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MULTI-FILE UPLOAD */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  isDragging ? 'border-neutral-900 bg-neutral-50 scale-[1.01]' : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-600">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-neutral-900 mb-1">
                  Upload your course papers, slides & notes
                </h4>
                <p className="text-xs text-neutral-500 mb-4">
                  Drag & drop PDFs, PowerPoint (.pptx), Word docs (.docx), or text files
                </p>

                <label className="inline-block px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm">
                  <span>Browse Files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.pptx,.ppt,.doc,.txt"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </label>
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Uploaded Files ({files.length})
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((file) => (
                      <div
                        key={file.fileId}
                        className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 flex-shrink-0 font-bold uppercase text-[10px]">
                            {file.fileType}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-neutral-900 truncate">{file.fileName}</div>
                            <div className="text-[10px] text-neutral-400">
                              {(file.fileSize / (1024 * 1024)).toFixed(2)} MB &bull; S3 Direct
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.uploading ? (
                            <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.fileId)}
                            className="p-1 hover:text-red-500 text-neutral-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!title.trim()}
                onClick={() => setStep(2)}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <span>Next: Upload Files</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
              >
                Back
              </button>
              <button
                type="button"
                disabled={files.length === 0 || isSubmitting || files.some((f) => f.uploading)}
                onClick={handleStartGeneration}
                className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Generate Study Roadmap with Antigravity</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
