"use client";

import { Loader2, PhoneCall, Route as RouteIcon, Siren, X } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";

type ActionButtonsProps = {
  visible?: boolean;
  onSafetyRoute: () => void;
  isSafetyRouteLoading?: boolean;
};

export function ActionButtons({
  visible = true,
  onSafetyRoute,
  isSafetyRouteLoading = false,
}: ActionButtonsProps) {
  const [sosOpen, setSosOpen] = useState(false);

  if (!visible) {
    return null;
  }

  return (
    <div className="mt-auto w-full pb-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="lg"
              disabled={isSafetyRouteLoading}
              className="min-h-14 w-full gap-2 rounded-xl bg-success text-lg! font-semibold! text-success-foreground hover:bg-success/80 disabled:bg-muted disabled:text-muted-foreground"
            >
              {isSafetyRouteLoading ? (
                <Loader2 className="h-5! w-5! animate-spin" />
              ) : (
                <RouteIcon className="h-5! w-5!" />
              )}
              Safety Route
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-success/15 text-success">
                <RouteIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Start safety routing?</AlertDialogTitle>
              <AlertDialogDescription>
                We will find the closest safe spot near you and start navigation
                there.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" className="rounded-lg">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-success text-success-foreground rounded-lg hover:bg-success/80"
                onClick={onSafetyRoute}
              >
                Start route
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="min-h-14 w-20 rounded-xl font-bold! text-lg!"
            >
              SOS
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Siren className="h-8 w-8" />
              </AlertDialogMedia>
              <AlertDialogTitle>Send an SOS alert?</AlertDialogTitle>
              <AlertDialogDescription>
                Sending an SOS will immediately alert emergency services and
                notify your emergency contacts with your live location.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" className="rounded-lg">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="rounded-lg"
                onClick={() => setSosOpen(true)}
              >
                Send SOS
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent
          showCloseButton={false}
          className="h-dvh max-w-none overflow-hidden rounded-none border-0 bg-linear-to-b from-destructive/15 via-background to-background p-0"
        >
          <VisuallyHidden>
            <DialogTitle>Emergency mode</DialogTitle>
            <DialogDescription>
              Emergency actions and status with quick access controls.
            </DialogDescription>
          </VisuallyHidden>
          <div className="relative h-full px-6 pb-8 pt-6 sm:px-10">
            <div className="flex items-center justify-between">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="icon-sm">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
              <div className="flex items-center gap-2 text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive/70" />
                <span className="text-xs font-semibold tracking-[0.25em]">
                  EMERGENCY
                </span>
              </div>
              <span className="h-9 w-9" />
            </div>

            <div className="mt-10 flex flex-col items-center text-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="absolute h-52 w-52 rounded-full border border-destructive/10 animate-ping" />
                <div className="absolute h-40 w-40 rounded-full border border-destructive/15 animate-ping" />
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-2xl">
                  <Siren className="h-10 w-10" />
                </div>
              </div>
              <p className="mt-12 text-base text-destructive font-semibold">
                Emergency mode active. <br /> Stay calm, help is on the way.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {/* Call button */}
              <a
                href="tel:112"
                className="flex w-full items-center gap-4 rounded-xl bg-destructive px-5 py-3.5 transition-opacity active:opacity-80"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <PhoneCall className="h-6 w-6 text-white" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-semibold text-white">
                    Call Emergency Services
                  </span>
                  <span className="block text-xs text-white/70">
                    Dial 112 · operator alerted
                  </span>
                </span>
                <span className="border-l border-white/20 pl-4 text-right">
                  <span className="block text-xl font-semibold leading-none text-white">
                    112
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-white/60">
                    Tap to call
                  </span>
                </span>
              </a>

              {/* Live location — always on */}
              <div className="rounded-xl border border-destructive/15 bg-destructive/5 px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <RouteIcon className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Live Location Sharing
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Streaming GPS to contacts + authorities
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                        Active
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      2 recipients
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
