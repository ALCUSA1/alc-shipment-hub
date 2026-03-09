import { ReactNode } from "react";
import { WarehouseSidebar } from "./WarehouseSidebar";

interface WarehouseLayoutProps {
  children: ReactNode;
}

export function WarehouseLayout({ children }: WarehouseLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <WarehouseSidebar />
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
