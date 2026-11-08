import './globals.css';

export const metadata = {
  title: 'PracticePad: practice plans your Claude writes',
  description: 'Music teachers use their own Claude to create student practice plans. PracticePad saves, edits and shares them live.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
