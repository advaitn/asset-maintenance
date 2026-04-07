import "./globals.css";
import type { Metadata } from "next";
import { AppToaster } from "@/components/app-toaster";
import { getMetadataBase } from "@/lib/site";

const description =
  "Factory asset maintenance — report issues, assign technicians, track materials, and confirm completion.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "Asset Maintenance",
    template: "%s · Asset Maintenance",
  },
  description,
  applicationName: "Asset Maintenance",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Asset Maintenance",
    title: "Asset Maintenance",
    description,
  },
  twitter: {
    card: "summary",
    title: "Asset Maintenance",
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
