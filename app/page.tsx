import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/google';
import LoginPage from './login/page';

export default async function HomePage() {
  redirect('/dashboard');
}
