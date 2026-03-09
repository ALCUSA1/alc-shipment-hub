import { ReactNode } from "react";
import { TruckingSidebar } from "./TruckingSidebar";

interface TruckingLayoutProps {
  children: ReactNode;
}

export function TruckingLayout({ children }: TruckingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TruckingSidebar />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
