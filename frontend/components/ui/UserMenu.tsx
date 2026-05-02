"use client";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitial(name?: string | null) {
  return name?.trim().charAt(0).toUpperCase() || "U";
}

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const displayName = session?.user?.name || session?.user?.email || "User";

  async function handleLogout() {
    await signOut({ redirect: false });
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          className="pointer-events-auto h-12 w-12 rounded-2xl border border-border/60 bg-card/95 text-primary shadow-2xl backdrop-blur-md transition-all duration-300 ease-out hover:bg-muted/40"
          aria-label="Open user menu"
          title="Account"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            {getInitial(displayName)}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-64 rounded-2xl border border-border/60 bg-card/95 p-2 text-foreground shadow-2xl backdrop-blur-md"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block text-xs font-normal text-muted-foreground">
            Signed in as
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuItem
          variant="destructive"
          className="gap-3"
          onSelect={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
