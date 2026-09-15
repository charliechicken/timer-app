import type { Activity, ActivityGroup, ActivityId } from "./types";

export type { Activity, ActivityGroup, ActivityId };

export const ACTIVITY_IDS: ActivityId[] = [
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
];

export const ACTIVITIES: Activity[] = [
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
];

export const ACTIVITY_MAP: Record<ActivityId, Activity> = Object.fromEntries(
  ACTIVITIES.map((activity) => [activity.id, activity]),
) as Record<ActivityId, Activity>;

export function activitiesInGroup(group: ActivityGroup): Activity[] {
  return ACTIVITIES.filter((activity) => activity.group === group);
}

export function isActivityId(value: string): value is ActivityId {
  return ACTIVITY_IDS.includes(value as ActivityId);
}
