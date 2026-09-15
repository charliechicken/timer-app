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

export type ExerciseId =
  | "unilateral-calf-raise"
  | "machine-leg-press"
  | "barbell-bench-press"
  | "lateral-raise-machine"
  | "weighted-pullup"
  | "weighted-dips"
  | "leg-extension"
  | "barbell-rdl"
  | "db-tricep-extension"
  | "weighted-russian-twist"
  | "db-lateral-raise"
  | "bicep-curl"
  | "machine-shoulder-press"
  | "calf-raise-machine"
  | "hanging-leg-raises"
  | "weighted-crunches"
  | "skull-crushers";

export type Exercise = {
  id: ExerciseId;
  label: string;
  split: SplitType;
  bodyPart: BodyPart;
  overloadReps: number;
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
  sets: [GymSet, GymSet];
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

export const EXERCISES: Exercise[] = [
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

export const EXERCISE_MAP: Record<ExerciseId, Exercise> = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
) as Record<ExerciseId, Exercise>;

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

export function exercisesForSplit(split: SplitType): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.split === split);
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
  return value in EXERCISE_MAP;
}

export function bodyPartLabel(part: BodyPart): string {
  return part[0].toUpperCase() + part.slice(1);
}
