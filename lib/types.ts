export type ActivityId = string;

export type ActivityGroup = "study" | "club" | "life" | "training";

export type Activity = {
  id: ActivityId;
  label: string;
  shortLabel: string;
  group: ActivityGroup;
  color: string;
  custom?: boolean;
  archived?: boolean;
};

export type Session = {
  id: string;
  activityId: ActivityId;
  startAt: number;
  endAt: number | null;
  targetEndAt: number | null;
  manual?: boolean;
};
