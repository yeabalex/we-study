import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'WeStudy - AI Exam Preparation Platform',
  description: 'Synthesize lecture notes, slides, and textbooks into a sequenced Coursera-style curriculum with tailored practice quizzes and dedicated AI tutor.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans antialiased h-full`}>
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-neutral-900">{children}</body>
    </html>
  );
}
