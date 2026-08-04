export type TripStatus = "draft" | "upcoming" | "active" | "completed" | "archived";

export type Trip = {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  startsOn: string | null;
  endsOn: string | null;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
};
