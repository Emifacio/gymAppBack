import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  Dumbbell,
  Flame,
  LayoutDashboard,
  Sparkles
} from "lucide-react";

export interface PublicOnboardingHighlight {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface PublicOnboardingSlide {
  id: string;
  accentLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
  highlights: PublicOnboardingHighlight[];
}

export const PUBLIC_ONBOARDING_SLIDES: PublicOnboardingSlide[] = [
  {
    id: "welcome",
    accentLabel: "Experiencia centralizada",
    eyebrow: "Todo ATLHYT, en una vista",
    title: "Bienvenido a ATLHYT",
    description: "Gestioná tus clases, reservas y progreso físico desde un solo lugar.",
    panelTitle: "Tu espacio de entrenamiento",
    panelDescription:
      "Una experiencia clara para entrenar, reservar y seguir tu ritmo sin fricción.",
    highlights: [
      { icon: LayoutDashboard, label: "Panel", value: "Todo a mano" },
      { icon: Dumbbell, label: "Clases", value: "Rutina ordenada" },
      { icon: Sparkles, label: "Experiencia", value: "Simple y premium" }
    ]
  },
  {
    id: "schedule",
    accentLabel: "Semana organizada",
    eyebrow: "Reservas y horarios",
    title: "Reservá y organizá tus entrenamientos",
    description:
      "Consultá horarios, anotate en clases y administrá tu semana de entrenamiento de forma simple.",
    panelTitle: "Tu agenda lista para entrenar",
    panelDescription:
      "Visualizá disponibilidad y definí tu semana en pocos toques, desde donde estés.",
    highlights: [
      { icon: CalendarDays, label: "Horarios", value: "Siempre visibles" },
      { icon: Dumbbell, label: "Reservas", value: "En segundos" },
      { icon: Flame, label: "Semana", value: "Más consistente" }
    ]
  },
  {
    id: "clarity",
    accentLabel: "Lectura instantánea",
    eyebrow: "Cuenta y actividad",
    title: "Todo tu entrenamiento, más claro",
    description:
      "Visualizá tu actividad, tus créditos y la información importante de tu cuenta en segundos.",
    panelTitle: "Datos que importan",
    panelDescription:
      "Actividad, créditos y estado de tu cuenta organizados para entenderlos sin buscar de más.",
    highlights: [
      { icon: ChartNoAxesCombined, label: "Actividad", value: "De un vistazo" },
      { icon: CreditCard, label: "Créditos", value: "Siempre claros" },
      { icon: Sparkles, label: "Cuenta", value: "Info importante" }
    ]
  }
];
