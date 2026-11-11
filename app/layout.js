import './globals.css';

export const metadata = {
  title: 'Mastercraft: your application season, crafted in one place',
  description: 'For MBA and master’s applicants. Your own Claude researches schools, plans essays and reviews drafts; Mastercraft keeps everything in one place.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
