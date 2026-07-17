import { IProject } from "@rishi/domain";

export interface IBaseEvent {
  eventId: string;
  timestamp: Date;
  correlationId: string;
}

export interface ProjectCreatedEvent extends IBaseEvent {
  eventType: "project.created";
  payload: {
    project: IProject;
  };
}
