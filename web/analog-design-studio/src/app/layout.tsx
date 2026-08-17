import './globals.css';
import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/lib/theme-provider';

export const metadata = {
  title: 'Analog Design Studio — Cadence Virtuoso & Spectre EDA Workstation',
  description: 'Specification-first analog IC design workspace and Cadence Virtuoso generator execution environment',
};

const antiFlashScript = `
(function() {
  try {
    var stored = localStorage.getItem('ads_theme');
    var isDark = stored === 'dark' || (!stored && true) || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (stored === 'light' || (stored === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
