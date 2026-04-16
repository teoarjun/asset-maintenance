export type Role = "USER" | "MANAGER" | "TECHNICIAN";

export type TaskStatus =
  | "REPORTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "AWAITING_MATERIAL_APPROVAL"
  | "PENDING_COMPLETION"
  | "CLOSED";

export type TaskUserRef = { id: number; name: string; email: string };

export type MaterialRequest = {
  id: number;
  itemsText: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type Task = {
  id: number;
  taskCode: string;
  title: string;
  description: string;
  machineryLabel: string | null;
  status: TaskStatus;
  reporter?: TaskUserRef;
  assignee?: TaskUserRef | null;
  materialRequests?: MaterialRequest[];
  updatedAt: string;
  createdAt: string;
};

export type TaskListResponse = {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};
