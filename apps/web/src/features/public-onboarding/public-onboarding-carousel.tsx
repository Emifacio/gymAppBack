import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  PUBLIC_ONBOARDING_SLIDES,
  type PublicOnboardingSlide
} from "@/features/public-onboarding/public-onboarding.slides";

interface PublicOnboardingCarouselProps {
  onComplete: () => void;
}

const SLIDE_GRADIENTS = [
  "from-[#0B84FF]/20 via-[#6CAEFF]/8 to-transparent",
  "from-[#14B8A6]/18 via-[#0B84FF]/10 to-transparent",
  "from-[#F59E0B]/18 via-[#0B84FF]/10 to-transparent"
] as const;

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 42 : -42,
    scale: 0.98
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -42 : 42,
    scale: 0.98
  })
};

export function PublicOnboardingCarousel({ onComplete }: PublicOnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const currentSlide = PUBLIC_ONBOARDING_SLIDES[currentIndex] ?? PUBLIC_ONBOARDING_SLIDES[0];
  const isLastSlide = currentIndex === PUBLIC_ONBOARDING_SLIDES.length - 1;
  const isFirstSlide = currentIndex === 0;

  const currentGradient = SLIDE_GRADIENTS[currentIndex] ?? SLIDE_GRADIENTS[0];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && !isLastSlide) {
        setDirection(1);
        setCurrentIndex((previous) => Math.min(previous + 1, PUBLIC_ONBOARDING_SLIDES.length - 1));
      }

      if (event.key === "ArrowLeft" && !isFirstSlide) {
        setDirection(-1);
        setCurrentIndex((previous) => Math.max(previous - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFirstSlide, isLastSlide]);

  if (!currentSlide) {
    return null;
  }

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
      return;
    }

    setDirection(1);
    setCurrentIndex((previous) => Math.min(previous + 1, PUBLIC_ONBOARDING_SLIDES.length - 1));
  };

  const handleBack = () => {
    if (isFirstSlide) {
      return;
    }

    setDirection(-1);
    setCurrentIndex((previous) => Math.max(previous - 1, 0));
  };

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(11,132,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_28%)]" />

      <div className="fixed top-5 right-5 z-20 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0D1B2A] p-10 text-white shadow-[0_30px_90px_rgba(5,18,34,0.28)] lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(108,174,255,0.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.18),transparent_36%)]" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-white/60">
              ATLHYT
            </p>
            <h1 className="section-title mt-6 text-5xl font-semibold leading-tight">
              Entrená con una experiencia más clara desde el primer ingreso.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/72">
              Conocé en segundos cómo ATLHYT organiza tus clases, tus reservas y la información
              clave de tu cuenta.
            </p>
          </div>

          <div className="relative grid gap-4 md:grid-cols-3">
            {PUBLIC_ONBOARDING_SLIDES.map((slide) => (
              <div
                key={slide.id}
                className="rounded-[1.75rem] border border-white/10 bg-white/8 px-5 py-4 backdrop-blur"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                  {slide.accentLabel}
                </p>
                <p className="mt-3 text-lg font-semibold text-white">{slide.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-label="Onboarding de bienvenida"
          aria-roledescription="carousel"
          className="relative overflow-hidden rounded-[2.5rem] border border-[var(--border-base)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,white_18%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur xl:p-8"
        >
          <div
            className={`pointer-events-none absolute inset-x-8 top-0 h-56 rounded-full bg-gradient-to-br ${currentGradient} blur-3xl transition-all duration-500`}
          />

          <div className="relative flex min-h-[calc(100vh-3rem)] flex-col sm:min-h-[700px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                  Primer recorrido
                </p>
                <p className="mt-2 text-sm text-[var(--text-muted)]" aria-live="polite">
                  {currentIndex + 1} de {PUBLIC_ONBOARDING_SLIDES.length}
                </p>
              </div>

              <Button
                aria-label="Saltar onboarding y continuar al inicio de sesión"
                className="rounded-full px-5"
                onClick={onComplete}
                size="sm"
                variant="ghost"
              >
                Skip
              </Button>
            </div>

            <div className="mt-8 flex flex-1 items-center">
              <AnimatePresence custom={direction} mode="wait">
                <motion.article
                  key={currentSlide.id}
                  animate="center"
                  aria-labelledby={`${currentSlide.id}-title`}
                  className="grid w-full gap-8"
                  custom={direction}
                  exit="exit"
                  initial="enter"
                  transition={{
                    duration: 0.42,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  variants={slideVariants}
                >
                  <PublicOnboardingVisual
                    gradientClassName={currentGradient}
                    slide={currentSlide}
                  />

                  <div className="space-y-4">
                    <span className="inline-flex rounded-full border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                      {currentSlide.eyebrow}
                    </span>
                    <h2
                      className="section-title text-4xl font-semibold leading-tight text-[var(--text-primary)] sm:text-5xl"
                      id={`${currentSlide.id}-title`}
                    >
                      {currentSlide.title}
                    </h2>
                    <p className="max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                      {currentSlide.description}
                    </p>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex flex-col gap-5 border-t border-[var(--border-base)] pt-6">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                {PUBLIC_ONBOARDING_SLIDES.map((slide, index) => (
                  <button
                    key={slide.id}
                    aria-current={index === currentIndex ? "true" : undefined}
                    aria-label={`Ir a la diapositiva ${index + 1}`}
                    className={`h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
                      index === currentIndex
                        ? "w-10 bg-[var(--accent)]"
                        : "w-3 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]"
                    }`}
                    onClick={() => handleDotClick(index)}
                    type="button"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-12 items-center">
                  {!isFirstSlide ? (
                    <Button
                      aria-label="Volver a la diapositiva anterior"
                      className="rounded-full px-5"
                      onClick={handleBack}
                      variant="outline"
                    >
                      <ArrowLeft aria-hidden="true" className="size-4" />
                      Back
                    </Button>
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">
                      Usá las flechas del teclado o los controles para avanzar.
                    </span>
                  )}
                </div>

                <Button
                  aria-label={
                    isLastSlide
                      ? "Completar onboarding e ir al inicio de sesión"
                      : "Ir a la siguiente diapositiva"
                  }
                  className="h-12 rounded-full px-6 shadow-lg shadow-[var(--accent-soft)]"
                  onClick={handleNext}
                  size="lg"
                  variant="primary"
                >
                  {isLastSlide ? "Comenzar" : "Next"}
                  {!isLastSlide ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface PublicOnboardingVisualProps {
  gradientClassName: string;
  slide: PublicOnboardingSlide;
}

function PublicOnboardingVisual({ gradientClassName, slide }: PublicOnboardingVisualProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-base)] bg-[var(--bg-surface)] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)] sm:p-6">
      <div
        className={`pointer-events-none absolute inset-x-6 -top-8 h-32 rounded-full bg-gradient-to-r ${gradientClassName} blur-2xl`}
      />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex rounded-full border border-[var(--border-base)] bg-[var(--bg-surface-secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              {slide.accentLabel}
            </span>
            <div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {slide.panelTitle}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                {slide.panelDescription}
              </p>
            </div>
          </div>

          <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-[0_18px_30px_rgba(148,163,184,0.18)] backdrop-blur sm:flex">
            <span className="h-3 w-3 rounded-full bg-[var(--accent)]" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {slide.highlights.map((highlight, index) => {
            const Icon = highlight.icon;

            return (
              <motion.div
                key={highlight.label}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[1.5rem] border border-[var(--border-base)] bg-[color-mix(in_srgb,var(--bg-surface-secondary)_72%,white_28%)] p-4"
                initial={{ opacity: 0, y: 12 }}
                transition={{
                  delay: 0.08 + index * 0.08,
                  duration: 0.28
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {highlight.label}
                  </span>
                </div>
                <p className="mt-5 text-lg font-semibold text-[var(--text-primary)]">
                  {highlight.value}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
