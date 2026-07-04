"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

const ToastContext = createContext<{
  toast: (message: string, type?: Toast["type"]) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-right",
              t.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              t.type === "error" && "border-red-200 bg-red-50 text-red-700",
              t.type === "info" && "border-zinc-200 bg-white text-zinc-800"
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))}>
              <X className="h-4 w-4 opacity-50" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
