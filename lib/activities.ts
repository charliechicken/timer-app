import type { Activity, ActivityGroup, ActivityId } from "./types";

export type { Activity, ActivityGroup, ActivityId };

export const BUILTIN_ACTIVITY_IDS = [
  "phil-1125",
  "econ-2251",
  "math-2460",
  "sds-2410",
  "chns-1300",
  "club-mma",
  "club-wrestling",
  "chess",
  "youtube",
  "instagram",
  "eating",
  "gym",
] as const;

export type BuiltinActivityId = (typeof BUILTIN_ACTIVITY_IDS)[number];

/** @deprecated Prefer BUILTIN_ACTIVITY_IDS — kept for older imports. */
export const ACTIVITY_IDS: ActivityId[] = [...BUILTIN_ACTIVITY_IDS];

export const CUSTOM_ACTIVITY_COLORS = [
  "#2a7f62",
  "#b85c38",
  "#3a6ea5",
  "#8b5a2b",
  "#5c6b4a",
  "#a14d57",
  "#2f6f7e",
  "#6b4f8a",
];

export const BUILTIN_ACTIVITIES: Activity[] = (
  [
    {
      id: "phil-1125",
      label: "PHIL 1125",
      shortLabel: "PHIL",
      group: "study",
      color: "#7c6bc4",
    },
    {
      id: "econ-2251",
      label: "ECON 2251",
      shortLabel: "ECON",
      group: "study",
      color: "#c4962a",
    },
    {
      id: "math-2460",
      label: "MATH 2460",
      shortLabel: "MATH",
      group: "study",
      color: "#3d7cc9",
    },
    {
      id: "sds-2410",
      label: "S&DS 2410",
      shortLabel: "S&DS",
      group: "study",
      color: "#1f9d8f",
    },
    {
      id: "chns-1300",
      label: "CHNS 1300",
      shortLabel: "CHNS",
      group: "study",
      color: "#c94b4b",
    },
    {
      id: "club-mma",
      label: "Club MMA",
      shortLabel: "MMA",
      group: "club",
      color: "#c45c26",
    },
    {
      id: "club-wrestling",
      label: "Club Wrestling",
      shortLabel: "Wrestle",
      group: "club",
      color: "#2f5d50",
    },
    {
      id: "chess",
      label: "Chess",
      shortLabel: "Chess",
      group: "life",
      color: "#4f8f4f",
    },
    {
      id: "youtube",
      label: "YouTube",
      shortLabel: "YT",
      group: "life",
      color: "#e23d3d",
    },
    {
      id: "instagram",
      label: "Instagram",
      shortLabel: "IG",
      group: "life",
      color: "#c7428a",
    },
    {
      id: "eating",
      label: "Eating",
      shortLabel: "Eat",
      group: "life",
      color: "#d9893b",
    },
    {
      id: "gym",
      label: "Gym",
      shortLabel: "Gym",
      group: "training",
      color: "#3d86c4",
    },
  ] as const satisfies ReadonlyArray<Omit<Activity, "custom" | "archived">>
).map((activity) => ({ ...activity, custom: false, archived: false }));

/** Built-in catalog only. Prefer resolveActivity / mergeActivityCatalog for full lists. */
export const ACTIVITIES: Activity[] = BUILTIN_ACTIVITIES;

export const ACTIVITY_MAP: Record<string, Activity> = Object.fromEntries(
  BUILTIN_ACTIVITIES.map((activity) => [activity.id, activity]),
);

export function isBuiltinActivityId(value: string): value is BuiltinActivityId {
  return (BUILTIN_ACTIVITY_IDS as readonly string[]).includes(value);
}

export function isCustomActivityId(value: string): boolean {
  return /^custom-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isActivityId(value: string): value is ActivityId {
  return isBuiltinActivityId(value) || isCustomActivityId(value);
}

export function colorForActivityId(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return CUSTOM_ACTIVITY_COLORS[hash % CUSTOM_ACTIVITY_COLORS.length];
}

export function slugActivityId(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom-${slug || "timer"}-${Date.now().toString(36)}`;
}

export function shortLabelFrom(label: string): string {
  const trimmed = label.trim();
  if (trimmed.length <= 8) return trimmed;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return trimmed.slice(0, 8);
  return words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 6);
}

export function labelFromCustomId(id: string): string {
  if (!id.startsWith("custom-")) return id;
  const parts = id.slice("custom-".length).split("-");
  if (parts.length > 1) parts.pop();
  const words = parts.filter(Boolean);
  if (!words.length) return "Custom";
  return words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join(" ");
}

export function mergeActivityCatalog(stored: Activity[]): Activity[] {
  const overlays = new Map(stored.map((activity) => [activity.id, activity]));
  const merged = BUILTIN_ACTIVITIES.map((activity) => {
    const overlay = overlays.get(activity.id);
    return overlay ? { ...activity, ...overlay, custom: false } : activity;
  });
  for (const activity of stored) {
    if (!merged.some((item) => item.id === activity.id)) merged.push(activity);
  }
  return merged;
}

export function visibleActivities(
  activities: Activity[],
  group?: ActivityGroup,
): Activity[] {
  return activities.filter(
    (activity) => !activity.archived && (!group || activity.group === group),
  );
}

export function activitiesInGroup(
  group: ActivityGroup,
  catalog: Activity[] = BUILTIN_ACTIVITIES,
): Activity[] {
  return visibleActivities(catalog, group);
}

export function activityMap(activities: Activity[]): Record<string, Activity> {
  return Object.fromEntries(activities.map((activity) => [activity.id, activity]));
}

export function resolveActivity(
  id: string,
  catalog: Activity[] = BUILTIN_ACTIVITIES,
): Activity {
  const found = catalog.find((activity) => activity.id === id) ?? ACTIVITY_MAP[id];
  if (found) return found;
  const label = labelFromCustomId(id);
  return {
    id,
    label,
    shortLabel: shortLabelFrom(label),
    group: "life",
    color: colorForActivityId(id),
    custom: isCustomActivityId(id),
    archived: false,
  };
}

export function emptyTotals(activities: Activity[]): Record<ActivityId, number> {
  return Object.fromEntries(activities.map((activity) => [activity.id, 0]));
}
