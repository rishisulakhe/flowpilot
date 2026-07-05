"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Moon, LogOut, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";

export function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-lg hover:bg-accent transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold select-none">
                  {initials}
                </div>
                <span className="text-sm text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                  {session.user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {signingOut ? "Signing out…" : "Sign Out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-semibold select-none">
            <User className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </nav>
  );
}
