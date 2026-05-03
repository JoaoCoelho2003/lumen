"use client";

import {
  useState,
  useLayoutEffect,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Shield,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Layers,
  SlidersHorizontal,
  Search,
  Map,
  TriangleAlert,
  Lightbulb,
  Flame,
  LightbulbOff,
  MapPin,
  Users,
  Route as RouteIcon,
  Siren,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lumen_onboarding_done";
const PAD = 10;

type Step = {
  id: string;
  selector?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  richContent?: React.ReactNode;
  isModal?: boolean;
  nextDelay?: number;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    isModal: true,
    icon: <Shield className="h-9 w-9 text-emerald-400" />,
    title: "Bem-vindo ao Lumen",
    description:
      "Navega em segurança com informação em tempo real da comunidade. Segue este guia para perceberes como funciona.",
  },
  {
    id: "recenter",
    selector: '[data-tutorial="recenter"]',
    icon: <Crosshair className="h-5 w-5" />,
    title: "A tua localização",
    description:
      "Toca aqui para centrar o mapa na tua posição e ativar o GPS.",
  },
  {
    id: "layers",
    selector: '[data-tutorial="layers"]',
    icon: <Layers className="h-5 w-5" />,
    title: "Camadas do mapa",
    description: "Toca para alternar entre três modos de visualização:",
    richContent: (
      <div className="mt-2.5 space-y-1.5">
        {(
          [
            {
              Icon: Map,
              color: "text-sky-400",
              bg: "bg-sky-400/10",
              label: "Satélite",
              desc: "Vista aérea detalhada",
            },
            {
              Icon: TriangleAlert,
              color: "text-red-400",
              bg: "bg-red-400/10",
              label: "Heatmap de crimes",
              desc: "Zonas com historial de incidentes",
            },
            {
              Icon: Lightbulb,
              color: "text-amber-400",
              bg: "bg-amber-400/10",
              label: "Iluminação",
              desc: "Cobertura de luz noturna",
            },
          ] as const
        ).map(({ Icon, color, bg, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "pin-drawer",
    selector: '[data-tutorial="pin-drawer"]',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: "Reporta o que vês",
    description: "Toca para reportar duas situações de perigo:",
    richContent: (
      <div className="mt-2.5 space-y-1.5">
        {(
          [
            {
              Icon: Flame,
              color: "text-red-400",
              bg: "bg-red-400/10",
              label: "Zona perigosa",
              desc: "Área com sensação de insegurança",
            },
            {
              Icon: LightbulbOff,
              color: "text-amber-400",
              bg: "bg-amber-400/10",
              label: "Pouca iluminação",
              desc: "Rua ou zona mal iluminada",
            },
          ] as const
        ).map(({ Icon, color, bg, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "search",
    selector: '[data-tutorial="search"]',
    icon: <Search className="h-5 w-5" />,
    title: "Pesquisa um destino",
    description:
      "Toca aqui para pesquisar para onde queres ir. O Lumen calcula a rota mais segura com base em dados da comunidade.",
  },
  {
    id: "settings",
    selector: '[data-tutorial="settings"]',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: "Definições de segurança",
    description: "Personaliza como o Lumen te protege:",
    richContent: (
      <div className="mt-2.5 space-y-1.5">
        {(
          [
            {
              Icon: MapPin,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
              label: "Safe Spots",
              desc: "Pontos seguros identificados automaticamente",
            },
            {
              Icon: Users,
              color: "text-violet-400",
              bg: "bg-violet-400/10",
              label: "Crowd Sharing",
              desc: "Partilha anónima para detetar zonas movimentadas",
            },
            {
              Icon: Layers,
              color: "text-blue-400",
              bg: "bg-blue-400/10",
              label: "Pesos de rota",
              desc: "Ajusta influência de luz e crime no percurso",
            },
          ] as const
        ).map(({ Icon, color, bg, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "action-buttons",
    selector: '[data-tutorial="action-buttons"]',
    icon: <RouteIcon className="h-5 w-5" />,
    title: "Segurança imediata",
    description: "Dois botões sempre disponíveis na app:",
    richContent: (
      <div className="mt-2.5 space-y-1.5">
        {(
          [
            {
              Icon: RouteIcon,
              color: "text-emerald-400",
              bg: "bg-emerald-400/10",
              label: "Safety Route",
              desc: "Rota automática para o ponto seguro mais próximo",
            },
            {
              Icon: Siren,
              color: "text-red-400",
              bg: "bg-red-400/10",
              label: "SOS",
              desc: "Alerta emergências e liga imediatamente para o 112",
            },
          ] as const
        ).map(({ Icon, color, bg, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg bg-muted/30 px-2.5 py-2"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "done",
    isModal: true,
    icon: <Shield className="h-9 w-9 text-emerald-400" />,
    title: "Estás pronto!",
    description:
      "Juntos tornamos as ruas mais seguras. Reporta zonas, partilha informação e navega com confiança.",
  },
];

type Rect = { x: number; y: number; w: number; h: number };

function measureElement(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Element exists but is scrolled out of the viewport (e.g. inside a low-snap drawer)
  if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return null;
  return {
    x: r.left - PAD,
    y: r.top - PAD,
    w: r.width + PAD * 2,
    h: r.height + PAD * 2,
  };
}

function elementInDom(selector: string): boolean {
  return Boolean(document.querySelector(selector));
}

function ModalStep({
  step,
  onNext,
  onSkip,
  isLast,
}: {
  step: Step;
  onNext: () => void;
  onSkip: () => void;
  isLast: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLast ? onNext : undefined}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-border/60 bg-card shadow-2xl sm:rounded-3xl">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-emerald-500/15 to-transparent px-6 pb-6 pt-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 shadow">
            {step.icon}
          </div>
        </div>
        <div className="px-6 pb-8">
          <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {step.description}
          </p>
          <div className="mt-6 flex gap-3">
            {!isLast && (
              <Button variant="ghost" className="flex-1" onClick={onSkip}>
                Saltar tutorial
              </Button>
            )}
            <Button className="flex-1" onClick={onNext}>
              {isLast ? (
                "Começar a explorar"
              ) : (
                <span className="flex items-center gap-1">
                  Começar <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpotlightStep({
  step,
  rect,
  elementHidden,
  onNext,
  onSkip,
  dotIndex,
  dotTotal,
}: {
  step: Step;
  rect: Rect | null;
  elementHidden: boolean;
  onNext: () => void;
  onSkip: () => void;
  dotIndex: number;
  dotTotal: number;
}) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 844;

  const noRect = !rect;
  const spotX = rect?.x ?? vw / 2 - 30;
  const spotY = rect?.y ?? vh / 2 - 30;
  const spotW = rect?.w ?? 60;
  const spotH = rect?.h ?? 60;

  const tooltipW = Math.min(300, vw - 32);

  // When element is hidden (off-screen), center the tooltip vertically
  const centeredTooltip = noRect && elementHidden;
  const rawLeft = spotX + spotW / 2 - tooltipW / 2;
  const tooltipLeft = centeredTooltip
    ? vw / 2 - tooltipW / 2
    : Math.max(16, Math.min(rawLeft, vw - tooltipW - 16));

  const elementMidY = spotY + spotH / 2;
  const below = centeredTooltip ? false : elementMidY < vh / 2;
  const tooltipTop = centeredTooltip
    ? vh / 2 - 120
    : below
      ? spotY + spotH + 14
      : undefined;
  const tooltipBottom =
    !centeredTooltip && !below ? vh - spotY + 14 : undefined;

  // Arrow offset relative to tooltip left edge
  const arrowLeft = Math.max(
    14,
    Math.min(spotX + spotW / 2 - tooltipLeft - 8, tooltipW - 28),
  );

  const transition = "all 0.3s cubic-bezier(0.4,0,0.2,1)";

  return (
    <>
      {/* 4-rect overlay */}
      {!noRect ? (
        <>
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              height: Math.max(0, spotY),
              background: "rgba(0,0,0,0.72)",
              zIndex: 45,
              transition,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              top: spotY + spotH,
              bottom: 0,
              background: "rgba(0,0,0,0.72)",
              zIndex: 45,
              transition,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: 0,
              top: spotY,
              width: Math.max(0, spotX),
              height: spotH,
              background: "rgba(0,0,0,0.72)",
              zIndex: 45,
              transition,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: spotX + spotW,
              top: spotY,
              right: 0,
              height: spotH,
              background: "rgba(0,0,0,0.72)",
              zIndex: 45,
              transition,
            }}
          />
        </>
      ) : (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 45,
          }}
        />
      )}

      {/* Spotlight ring */}
      {!noRect && (
        <div
          aria-hidden
          className="animate-pulse"
          style={{
            position: "fixed",
            left: spotX,
            top: spotY,
            width: spotW,
            height: spotH,
            borderRadius: 16,
            boxShadow: "0 0 0 2.5px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.25)",
            zIndex: 55,
            pointerEvents: "none",
            transition,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          left: tooltipLeft,
          top: tooltipTop,
          bottom: tooltipBottom,
          width: tooltipW,
          zIndex: 60,
          transition,
        }}
      >
        {/* Arrow pointing to element */}
        {!noRect && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: arrowLeft,
              width: 0,
              height: 0,
              ...(below
                ? {
                    top: -6,
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderBottom: "6px solid hsl(var(--border) / 0.6)",
                  }
                : {
                    bottom: -6,
                    borderLeft: "7px solid transparent",
                    borderRight: "7px solid transparent",
                    borderTop: "6px solid hsl(var(--border) / 0.6)",
                  }),
            }}
          />
        )}

        <div className="rounded-2xl border border-border/60 bg-card/98 p-4 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              {step.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>

          {/* Rich content */}
          {step.richContent}

          {/* Pull-up hint when element is in DOM but off-screen */}
          {elementHidden && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2">
              <ChevronUp className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-4 text-amber-400">
                Arrasta o painel para cima para ver estes botões.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: dotTotal }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === dotIndex
                      ? "w-5 bg-primary"
                      : i < dotIndex
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Saltar
              </button>
              <Button size="sm" className="h-7 px-3 text-xs" onClick={onNext}>
                Próximo <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function OnboardingTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const current = STEPS[step];

  const measure = useCallback(() => {
    if (!current?.selector) {
      setRect(null);
      return;
    }
    const r = measureElement(current.selector);
    if (r) {
      setRect(r);
    } else {
      window.requestAnimationFrame(() => {
        setRect(measureElement(current!.selector!));
      });
    }
  }, [current]);

  useLayoutEffect(() => {
    if (!visible) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [visible, measure]);

  // Poll for off-screen elements (e.g. action buttons inside a low-snap drawer)
  useEffect(() => {
    if (!visible || !current?.selector || rect !== null) return;
    if (!elementInDom(current.selector)) return;

    const interval = window.setInterval(() => {
      const r = measureElement(current.selector!);
      if (r) setRect(r);
    }, 250);

    return () => window.clearInterval(interval);
  }, [visible, current, rect]);

  // Advance when user taps the highlighted element
  useEffect(() => {
    if (!visible || !current?.selector) return;

    const delay = current.nextDelay ?? 350;

    const handleCapture = (e: MouseEvent) => {
      const target = document.querySelector(current.selector!);
      if (
        target &&
        (target === e.target || target.contains(e.target as Node))
      ) {
        window.setTimeout(advance, delay);
      }
    };

    document.addEventListener("click", handleCapture, true);
    return () => document.removeEventListener("click", handleCapture, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current]);

  function advance() {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        finish();
        return s;
      }
      return s + 1;
    });
  }

  function next() {
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible || !current) return null;

  if (current.isModal) {
    return (
      <ModalStep
        step={current}
        onNext={next}
        onSkip={finish}
        isLast={step === STEPS.length - 1}
      />
    );
  }

  const guidedSteps = STEPS.filter((s) => !s.isModal);
  const dotIndex = guidedSteps.findIndex((s) => s.id === current.id);
  const elementHidden =
    Boolean(current.selector) && rect === null && elementInDom(current.selector!);

  return (
    <SpotlightStep
      step={current}
      rect={rect}
      elementHidden={elementHidden}
      onNext={next}
      onSkip={finish}
      dotIndex={dotIndex}
      dotTotal={guidedSteps.length}
    />
  );
}
