import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: string;
}

export function PageHeader({ title, subtitle, back }: PageHeaderProps) {
  return (
    <header className="mb-6 animate-fade-in">
      {back && (
        <Link
          href={back}
          className="mb-3 inline-flex items-center gap-1 text-sm text-mist-400 hover:text-mist-200"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-mist-50">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-mist-400">{subtitle}</p>}
    </header>
  );
}
