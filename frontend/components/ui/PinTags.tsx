"use client";

import type { ComponentType } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type PinTag = {
  icon: ComponentType<{ className?: string }>;
  name: string;
  value: string;
  colorClass: string;
  bgClass: string;
  ringClass: string;
};

type PinTagsProps = {
  tags: PinTag[];
  onConfirm?: (tag: PinTag) => void;
};

export function PinTags({ tags, onConfirm }: PinTagsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 py-4 mb-8">
      {tags.map((tag) => {
        const Icon = tag.icon;

        return (
          <AlertDialog key={tag.value}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="group flex flex-col items-center gap-2 text-center text-foreground/80 shadow-sm transition hover:-translate-y-0.5"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${tag.bgClass} ring-1 ${tag.ringClass}`}
                >
                  <Icon className={`h-7 w-7 ${tag.colorClass}`} />
                </span>
                <span className="text-xs font-medium">{tag.name}</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit this pin?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to submit a pin for {tag.name}. Confirm to
                  continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onConfirm?.(tag)}>
                  Submit pin
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })}
    </div>
  );
}
