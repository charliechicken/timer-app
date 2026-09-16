export type BodyPart =
  | "shoulder"
  | "calves"
  | "chest"
  | "tricep"
  | "bicep"
  | "abs"
  | "quads"
  | "hamstrings"
  | "back";

export type SplitType = "full-body" | "isolation";

export type ExerciseId = string;

export type Exercise = {
  id: ExerciseId;
  label: string;
  split: SplitType;
  bodyPart: BodyPart;
  overloadReps: number;
  sortOrder?: number;
  custom?: boolean;
  archived?: boolean;
};

export type GymSet = {
  weight: number;
  reps: number;
};

export type GymLog = {
  id: string;
  exerciseId: ExerciseId;
  split: SplitType;
  loggedAt: number;
  dateKey: string;
  sets: GymSet[];
};

export type GymDay = {
  id: string;
  dateKey: string;
  split: SplitType;
  startedAt: number;
};

export type GymGoal = {
  id: string;
  exerciseId: ExerciseId;
  weight: number;
  reps: number;
};

export const BODY_PARTS: BodyPart[] = [
  "shoulder",
  "calves",
  "chest",
  "tricep",
  "bicep",
  "abs",
  "quads",
  "hamstrings",
  "back",
];

const BASE_EXERCISES: Omit<Exercise, "sortOrder" | "custom" | "archived">[] = [
  {
    id: "unilateral-calf-raise",
    label: "Unilateral leg press calf raise",
    split: "full-body",
    bodyPart: "calves",
    overloadReps: 12,
  },
  {
    id: "machine-leg-press",
    label: "Machine leg press",
    split: "full-body",
    bodyPart: "quads",
    overloadReps: 10,
  },
  {
    id: "barbell-bench-press",
    label: "Barbell bench press",
    split: "full-body",
    bodyPart: "chest",
    overloadReps: 5,
  },
  {
    id: "lateral-raise-machine",
    label: "Lateral raise machine",
    split: "full-body",
    bodyPart: "shoulder",
    overloadReps: 15,
  },
  {
    id: "weighted-pullup",
    label: "Weighted pull-up",
    split: "full-body",
    bodyPart: "back",
    overloadReps: 7,
  },
  {
    id: "weighted-dips",
    label: "Weighted dips",
    split: "full-body",
    bodyPart: "chest",
    overloadReps: 8,
  },
  {
    id: "leg-extension",
    label: "Leg extension",
    split: "full-body",
    bodyPart: "quads",
    overloadReps: 10,
  },
  {
    id: "barbell-rdl",
    label: "Barbell RDL",
    split: "full-body",
    bodyPart: "hamstrings",
    overloadReps: 7,
  },
  {
    id: "db-tricep-extension",
    label: "Dumbbell tricep extension",
    split: "full-body",
    bodyPart: "tricep",
    overloadReps: 12,
  },
  {
    id: "weighted-russian-twist",
    label: "Weighted Russian twist",
    split: "full-body",
    bodyPart: "abs",
    overloadReps: 15,
  },
  {
    id: "db-lateral-raise",
    label: "Dumbbell lateral raise",
    split: "isolation",
    bodyPart: "shoulder",
    overloadReps: 12,
  },
  {
    id: "bicep-curl",
    label: "Bicep curl",
    split: "isolation",
    bodyPart: "bicep",
    overloadReps: 10,
  },
  {
    id: "machine-shoulder-press",
    label: "Machine shoulder press",
    split: "isolation",
    bodyPart: "shoulder",
    overloadReps: 10,
  },
  {
    id: "calf-raise-machine",
    label: "Calf raise machine",
    split: "isolation",
    bodyPart: "calves",
    overloadReps: 12,
  },
  {
    id: "hanging-leg-raises",
    label: "Hanging leg raises",
    split: "isolation",
    bodyPart: "abs",
    overloadReps: 10,
  },
  {
    id: "weighted-crunches",
    label: "Weighted crunches",
    split: "isolation",
    bodyPart: "abs",
    overloadReps: 8,
  },
  {
    id: "skull-crushers",
    label: "Skull crushers",
    split: "isolation",
    bodyPart: "tricep",
    overloadReps: 10,
  },
];

export const EXERCISES: Exercise[] = BASE_EXERCISES.map((exercise, index) => ({
  ...exercise,
  sortOrder: index * 10,
  custom: false,
  archived: false,
}));

export const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
);

export const LIFT_COLORS = [
  "#3d86c4",
  "#c0453a",
  "#2a9d8f",
  "#8a5a2b",
  "#7b5ea7",
  "#e76f51",
  "#457b9d",
  "#2a9d4f",
];

export const DEFAULT_GOALS: GymGoal[] = [
  {
    id: "goal-bench-200x5",
    exerciseId: "barbell-bench-press",
    weight: 200,
    reps: 5,
  },
  {
    id: "goal-rdl-225x7",
    exerciseId: "barbell-rdl",
    weight: 225,
    reps: 7,
  },
];

export function catalogMap(exercises: Exercise[]): Record<string, Exercise> {
  return Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise]));
}

export function mergeExerciseCatalog(stored: Exercise[]): Exercise[] {
  const overlays = new Map(stored.map((exercise) => [exercise.id, exercise]));
  const merged = EXERCISES.map((exercise) => {
    const overlay = overlays.get(exercise.id);
    return overlay ? { ...exercise, ...overlay, custom: false } : exercise;
  });
  for (const exercise of stored) {
    if (!merged.some((item) => item.id === exercise.id)) merged.push(exercise);
  }
  return merged.sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label),
  );
}

export function visibleExercises(exercises: Exercise[], split?: SplitType): Exercise[] {
  return exercises.filter(
    (exercise) => !exercise.archived && (!split || exercise.split === split),
  );
}

export function exerciseLabel(exerciseId: string, exercises: Exercise[]): string {
  return (
    exercises.find((exercise) => exercise.id === exerciseId)?.label ??
    EXERCISE_MAP[exerciseId]?.label ??
    exerciseId
  );
}

export function exercisesForSplit(split: SplitType, catalog = EXERCISES): Exercise[] {
  return visibleExercises(catalog, split);
}

export function suggestedSplit(date = new Date()): SplitType | "rest" {
  const day = date.getDay();
  if (day === 0) return "rest";
  return day % 2 === 1 ? "full-body" : "isolation";
}

export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function bestSet(sets: GymSet[]): GymSet {
  return sets.reduce(
    (best, set) =>
      epley1RM(set.weight, set.reps) > epley1RM(best.weight, best.reps)
        ? set
        : best,
    sets[0] ?? { weight: 0, reps: 0 },
  );
}

export function relativeScore(set: GymSet, overloadReps: number): number {
  if (set.weight <= 0 || overloadReps <= 0) return 0;
  return set.weight * (set.reps / overloadReps);
}

export function isExerciseId(value: string): value is ExerciseId {
  return typeof value === "string" && value.trim().length > 0;
}

export function isBodyPart(value: string): value is BodyPart {
  return (BODY_PARTS as string[]).includes(value);
}

export function bodyPartLabel(part: BodyPart): string {
  return part[0].toUpperCase() + part.slice(1);
}

export function emaSeries(values: number[], alpha = 0.35): number[] {
  if (values.length === 0) return [];
  const series = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    series.push(alpha * values[index] + (1 - alpha) * series[index - 1]);
  }
  return series;
}

export function completedSets(sets: GymSet[]): GymSet[] {
  return sets.filter((set) => set.weight > 0 || set.reps > 0);
}

export function slugExerciseId(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom-${slug || "lift"}-${Date.now().toString(36)}`;
}
