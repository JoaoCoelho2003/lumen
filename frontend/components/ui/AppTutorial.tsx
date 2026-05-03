"use client";

import {
  Bell,
  Layers,
  MapPin,
  Navigation,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/alert-dialog";

type AppTutorialProps = {
  userKey?: string | null;
  enabled: boolean;
};

const steps = [
  {
    icon: MapPin,
    title: "Start with your location",
    body: "Lumen centers around your current position. The crosshair button recenters the map, and the blue marker shows where routes start from.",
  },
  {
    icon: Search,
    title: "Search for a destination",
    body: "Use the bottom search bar to find hospitals, landmarks, buildings, streets, or places in Portugal. Selecting a result previews a route.",
  },
  {
    icon: Route,
    title: "Compare safer routes",
    body: "When Mapbox returns alternatives, Lumen ranks them using lighting coverage, reported risks, dark stretches, travel time, and your saved weights.",
  },
  {
    icon: Navigation,
    title: "Review and navigate",
    body: "After choosing a destination, the Route tab explains why the route was selected. The Directions tab lists each turn before you start the trip.",
  },
  {
    icon: ShieldCheck,
    title: "Use Safety Route",
    body: "Safety Route finds the closest safe spot and navigates there. Safe spots include police, hospitals, firefighters, and active trusted crowds.",
  },
  {
    icon: Users,
    title: "Crowd safe spots",
    body: "If you opt in, Lumen anonymously shares short-lived presence so active groups of app users can become dynamic crowd safe spots.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tune safety settings",
    body: "Before picking a route, use settings to show safe spots, enable crowd sharing, and adjust how much lighting or crime affects route scoring.",
  },
  {
    icon: Layers,
    title: "Inspect map layers",
    body: "The floating layer button switches between normal map mode, satellite, incident heatmap, and lighting coverage.",
  },
  {
    icon: Bell,
    title: "Report and emergency tools",
    body: "Use the pin drawer to report low-light or dangerous areas. SOS opens emergency actions for fast help when you need it.",
  },
];

function storageKeyForUser(userKey: string) {
  return `lumen:tutorial-complete:${userKey}`;
}

export function AppTutorial({ userKey, enabled }: AppTutorialProps) {
  const [open, setOpen] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = steps[stepIndex];
  const storageKey = useMemo(
    () => (userKey ? storageKeyForUser(userKey) : null),
    [userKey],
  );
  const Icon = activeStep.icon;

  useEffect(() => {
    if (!enabled || !storageKey) {
      return;
    }

    const showTutorial = window.setTimeout(() => {
      const alreadyCompleted = window.localStorage.getItem(storageKey) === "true";
      setOpen(!alreadyCompleted);
      setStepIndex(0);
    }, 0);

    return () => window.clearTimeout(showTutorial);
  }, [enabled, storageKey]);

  function completeTutorial() {
    if (storageKey) {
      window.localStorage.setItem(storageKey, "true");
    }

    setOpen(false);
    setSkipConfirmOpen(false);
  }

  if (!open) {
    return null;
  }

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center">
        <section className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-4 text-foreground shadow-2xl backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <h2 className="mt-1 text-lg font-semibold leading-tight">
                {activeStep.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeStep.body}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-1.5">
            {steps.map((step) => (
              <span
                key={step.title}
                className={`h-1.5 flex-1 rounded-full ${
                  steps.indexOf(step) <= stepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <button
              type="button"
              onClick={() => setSkipConfirmOpen(true)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
            >
              Skip
            </button>
            <span />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                disabled={stepIndex === 0}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  isLastStep
                    ? completeTutorial()
                    : setStepIndex((current) => current + 1)
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {isLastStep ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/15 text-primary">
              <ShieldCheck />
            </AlertDialogMedia>
            <AlertDialogTitle>Skip the tutorial?</AlertDialogTitle>
            <AlertDialogDescription>
              The tutorial will not appear again for this account. You can still
              use every feature normally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" className="rounded-lg">
              Continue tutorial
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-lg" onClick={completeTutorial}>
              Skip tutorial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
