import './globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata = { title: 'Analog Design Studio', description: 'Repository-backed analog IC design configuration workspace' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
