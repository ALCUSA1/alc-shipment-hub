import { ReactNode } from "react";
import { ForwarderSidebar } from "./ForwarderSidebar";

interface ForwarderLayoutProps {
  children: ReactNode;
}

export function ForwarderLayout({ children }: ForwarderLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <ForwarderSidebar />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
