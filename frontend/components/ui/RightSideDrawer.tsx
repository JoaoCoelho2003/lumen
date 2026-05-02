"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type RightSideDrawerProps = {
  title: string;
  description?: string;
  triggerLabel: string;
  children: React.ReactNode;
  triggerIcon?: React.ReactNode;
  inlineStatus?: React.ReactNode;
  className?: string;
  hasBlur?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function RightSideDrawer({
  title,
  description,
  triggerLabel,
  children,
  triggerIcon,
  inlineStatus,
  className,
  hasBlur = false,
  open,
  onOpenChange,
}: RightSideDrawerProps) {
  const [drawerOffset, setDrawerOffset] = React.useState(16);

  React.useEffect(() => {
    let frame = 0;

    const updateOffset = () => {
      const drawers = Array.from(
        document.querySelectorAll("[data-vaul-drawer]"),
      ) as HTMLElement[];
      const bottomDrawer = drawers.find(
        (drawer) =>
          drawer.getAttribute("data-vaul-drawer-direction") === "bottom",
      );

      if (bottomDrawer) {
        const rect = bottomDrawer.getBoundingClientRect();
        const gap = 16;
        const nextOffset = Math.max(gap, window.innerHeight - rect.top + gap);

        setDrawerOffset((current) =>
          Math.abs(current - nextOffset) > 1 ? nextOffset : current,
        );
      }

      frame = window.requestAnimationFrame(updateOffset);
    };

    frame = window.requestAnimationFrame(updateOffset);

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn("fixed right-3 z-10 flex items-center gap-2", className)}
      style={{ bottom: drawerOffset }}
    >
      {inlineStatus}
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>
          <Button
            size="icon-lg"
            className={cn(
              "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-2xl transition-all duration-300 ease-out hover:bg-muted",
              hasBlur && "backdrop-blur-md",
            )}
            aria-label={triggerLabel}
          >
            {triggerIcon ?? <SlidersHorizontal className="h-5 w-5" />}
          </Button>
        </DrawerTrigger>
        <DrawerContent
          overlayBlur={hasBlur}
          className={cn(
            "z-50 mx-auto w-full max-w-none border-x border-t border-border bg-card p-0 text-foreground shadow-2xl before:hidden",
            hasBlur && "backdrop-blur-md",
          )}
        >
          <div className="w-full">
            <DrawerHeader className="relative">
              <DrawerTitle>{title}</DrawerTitle>
              {description && (
                <DrawerDescription>{description}</DrawerDescription>
              )}
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>

            <div className="p-4 pt-0">{children}</div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
