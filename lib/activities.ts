import type { Activity, ActivityGroup, ActivityId } from "./types";

export type { Activity, ActivityGroup, ActivityId };

export const ACTIVITIES: Activity[] = [
  {
    id: "phil-1125",
    label: "PHIL 1125",
    shortLabel: "PHIL",
    group: "class",
    color: "#b7a4ff",
  },
  {
    id: "econ-2251",
    label: "ECON 2251",
    shortLabel: "ECON",
    group: "class",
    color: "#e8c547",
  },
  {
    id: "math-2460",
    label: "MATH 2460",
    shortLabel: "MATH",
    group: "class",
    color: "#6cb3ea",
  },
  {
    id: "sds-2410",
    label: "S&DS 2410",
    shortLabel: "S&DS",
    group: "class",
    color: "#3dcdc0",
  },
  {
    id: "chns-1300",
    label: "CHNS 1300",
    shortLabel: "CHNS",
    group: "class",
    color: "#e05d5d",
  },
  {
    id: "chess",
    label: "Chess",
    shortLabel: "Chess",
    group: "life",
    color: "#7cb87c",
  },
  {
    id: "youtube",
    label: "YouTube",
    shortLabel: "YT",
    group: "life",
    color: "#ff5a5a",
  },
  {
    id: "instagram",
    label: "Instagram",
    shortLabel: "IG",
    group: "life",
    color: "#e85aad",
  },
  {
    id: "eating",
    label: "Eating",
    shortLabel: "Eat",
    group: "life",
    color: "#f0a04b",
  },
];

export const ACTIVITY_MAP: Record<ActivityId, Activity> = Object.fromEntries(
  ACTIVITIES.map((activity) => [activity.id, activity]),
) as Record<ActivityId, Activity>;

export function activitiesInGroup(group: ActivityGroup): Activity[] {
  return ACTIVITIES.filter((activity) => activity.group === group);
}
