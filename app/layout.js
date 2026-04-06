import "../frontend/globals.css";

export const metadata = {
  title: "PulseChat",
  description:
    "A polished real-time style chat application built with Next.js and SQLite.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
