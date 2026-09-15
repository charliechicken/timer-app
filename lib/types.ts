export type ActivityId =
  | "chess"
  | "phil-1125"
  | "econ-2251"
  | "math-2460"
  | "sds-2410"
  | "chns-1300"
  | "youtube"
  | "instagram"
  | "eating";

export type ActivityGroup = "class" | "life";

export type Activity = {
  id: ActivityId;
  label: string;
  shortLabel: string;
  group: ActivityGroup;
  color: string;
};

export type Session = {
  id: string;
  activityId: ActivityId;
  startAt: number;
  endAt: number | null;
};
