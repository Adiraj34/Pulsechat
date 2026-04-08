import "../frontend/globals.css";

export const metadata = {
  title: "FinVeil Control Center",
  description:
    "Finance dashboard backend assignment with role-aware analytics and record management.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
