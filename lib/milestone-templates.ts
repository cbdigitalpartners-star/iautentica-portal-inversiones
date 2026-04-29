export const MILESTONE_TEMPLATES = [
  "Al inicio",
  "A la escritura",
  "Fin 1era etapa",
  "Fin 2da etapa",
  "Fin 3era etapa",
  "Entrega",
] as const;

export type MilestoneTemplate = (typeof MILESTONE_TEMPLATES)[number];
