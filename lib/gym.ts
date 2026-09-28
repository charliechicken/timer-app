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

export type SplitType = "push" | "pull" | "legs" | "upper" | "lower";

export type ExerciseId = string;

export type Exercise = {
  id: ExerciseId;
  label: string;
  /** Day templates this lift appears on. Same id → shared weights/reps. */
  splits: SplitType[];
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

export const SPLIT_TYPES: SplitType[] = ["push", "pull", "legs", "upper", "lower"];

export const SPLIT_LABELS: Record<SplitType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
};

/** Mon push · Tue pull · Wed legs · Thu rest · Fri upper · Sat lower · Sun rest */
export const WEEK_SPLIT_PLAN: Array<SplitType | "rest"> = [
  "push",
  "pull",
  "legs",
  "rest",
  "upper",
  "lower",
  "rest",
];

const BASE_EXERCISES: Omit<Exercise, "sortOrder" | "custom" | "archived">[] = [
  {
    id: "unilateral-calf-raise",
    label: "Unilateral leg press calf raise",
    splits: ["legs", "lower"],
    bodyPart: "calves",
    overloadReps: 12,
  },
  {
    id: "machine-leg-press",
    label: "Machine leg press",
    splits: ["legs", "lower"],
    bodyPart: "quads",
    overloadReps: 10,
  },
  {
    id: "barbell-bench-press",
    label: "Barbell bench press",
    splits: ["push", "upper"],
    bodyPart: "chest",
    overloadReps: 5,
  },
  {
    id: "lateral-raise-machine",
    label: "Lateral raise machine",
    splits: ["push", "upper"],
    bodyPart: "shoulder",
    overloadReps: 15,
  },
  {
    id: "weighted-pullup",
    label: "Weighted pull-up",
    splits: ["pull", "upper"],
    bodyPart: "back",
    overloadReps: 7,
  },
  {
    id: "weighted-dips",
    label: "Weighted dips",
    splits: ["push", "upper"],
    bodyPart: "chest",
    overloadReps: 8,
  },
  {
    id: "leg-extension",
    label: "Leg extension",
    splits: ["legs", "lower"],
    bodyPart: "quads",
    overloadReps: 10,
  },
  {
    id: "barbell-rdl",
    label: "Barbell RDL",
    splits: ["pull", "legs", "lower"],
    bodyPart: "hamstrings",
    overloadReps: 7,
  },
  {
    id: "db-tricep-extension",
    label: "Dumbbell tricep extension",
    splits: ["push", "upper"],
    bodyPart: "tricep",
    overloadReps: 12,
  },
  {
    id: "weighted-russian-twist",
    label: "Weighted Russian twist",
    splits: ["legs", "upper"],
    bodyPart: "abs",
    overloadReps: 15,
  },
  {
    id: "db-lateral-raise",
    label: "Dumbbell lateral raise",
    splits: ["push", "upper"],
    bodyPart: "shoulder",
    overloadReps: 12,
  },
  {
    id: "bicep-curl",
    label: "Bicep curl",
    splits: ["pull", "upper"],
    bodyPart: "bicep",
    overloadReps: 10,
  },
  {
    id: "machine-shoulder-press",
    label: "Machine shoulder press",
    splits: ["push", "upper"],
    bodyPart: "shoulder",
    overloadReps: 10,
  },
  {
    id: "calf-raise-machine",
    label: "Calf raise machine",
    splits: ["legs", "lower"],
    bodyPart: "calves",
    overloadReps: 12,
  },
  {
    id: "hanging-leg-raises",
    label: "Hanging leg raises",
    splits: ["legs", "lower"],
    bodyPart: "abs",
    overloadReps: 10,
  },
  {
    id: "weighted-crunches",
    label: "Weighted crunches",
    splits: ["legs", "upper"],
    bodyPart: "abs",
    overloadReps: 8,
  },
  {
    id: "skull-crushers",
    label: "Skull crushers",
    splits: ["push", "upper"],
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

export function isSplitType(value: string): value is SplitType {
  return (SPLIT_TYPES as string[]).includes(value);
}

/** Map legacy full-body / isolation values onto the new split names. */
export function normalizeSplit(value: unknown): SplitType | null {
  if (typeof value !== "string") return null;
  if (isSplitType(value)) return value;
  if (value === "full-body") return "push";
  if (value === "isolation") return "upper";
  return null;
}

export function normalizeSplits(raw: unknown, fallbackSplit?: unknown): SplitType[] {
  if (Array.isArray(raw)) {
    const unique = [...new Set(raw.map(normalizeSplit).filter((s): s is SplitType => s !== null))];
    if (unique.length) return unique;
  }
  const single = normalizeSplit(fallbackSplit);
  return single ? [single] : [];
}

export function exerciseOnSplit(exercise: Exercise, split: SplitType): boolean {
  return exercise.splits.includes(split);
}

export function splitLabel(split: SplitType | "rest"): string {
  if (split === "rest") return "Rest";
  return SPLIT_LABELS[split];
}

export function catalogMap(exercises: Exercise[]): Record<string, Exercise> {
  return Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise]));
}

export function mergeExerciseCatalog(stored: Exercise[]): Exercise[] {
  const overlays = new Map(stored.map((exercise) => [exercise.id, exercise]));
  const merged = EXERCISES.map((exercise) => {
    const overlay = overlays.get(exercise.id);
    if (!overlay) return exercise;
    const splits =
      overlay.splits?.length > 0
        ? [...new Set(overlay.splits)]
        : exercise.splits;
    return { ...exercise, ...overlay, splits, custom: false };
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
    (exercise) =>
      !exercise.archived &&
      (!split || exerciseOnSplit(exercise, split)),
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

/**
 * Monday-start plan: push, pull, legs, rest, upper, lower, rest.
 * `getDay()`: 0 Sun … 6 Sat → index into WEEK_SPLIT_PLAN via Mon=0.
 */
export function suggestedSplit(date = new Date()): SplitType | "rest" {
  const mondayIndex = (date.getDay() + 6) % 7;
  return WEEK_SPLIT_PLAN[mondayIndex] ?? "rest";
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
