"use client";

import { KeyRound, Moon, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";

export function Navbar() {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm select-none">
          F
        </div>
        <span className="font-semibold text-foreground tracking-tight">FlowPilot</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <KeyRound className="w-4 h-4" />
          <span className="text-sm">API Keys</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground w-8 h-8">
          <Moon className="w-4 h-4" />
        </Button>

        {session?.user ? (
          <>
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold select-none">
              {initials}
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline max-w-[120px] truncate">
              {session.user.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="w-8 h-8 text-muted-foreground hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold select-none">
            <User className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </nav>
  );
}
