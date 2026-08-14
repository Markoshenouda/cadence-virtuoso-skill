import './globals.css';

export const metadata = { title: 'Analog Design Studio', description: 'Repository-backed analog IC design configuration workspace' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
