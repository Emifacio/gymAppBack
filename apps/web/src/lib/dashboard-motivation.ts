const BASE_DASHBOARD_MOTIVATION_MESSAGES = [
  "Hoy es un gran dia para entrenar.",
  "La disciplina supera a la motivacion.",
  "Tu mejor version se construye hoy."
] as const;

export function getDashboardMotivationMessages(firstName?: string | null) {
  const normalizedFirstName = firstName?.trim();

  if (!normalizedFirstName) {
    return [...BASE_DASHBOARD_MOTIVATION_MESSAGES];
  }

  return [
    `${normalizedFirstName}, hoy es un gran dia para entrenar.`,
    ...BASE_DASHBOARD_MOTIVATION_MESSAGES.filter(
      (message) => message !== "Hoy es un gran dia para entrenar."
    )
  ];
}
