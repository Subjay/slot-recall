import { account } from "./account";
import { call, callStatus } from "./call";
import { client, clientAvailability } from "./client";
import { doctor } from "./doctor";
import { location } from "./location";
import { rateLimit } from "./rate-limit";
import {
  accountRelations,
  callRelations,
  clientRelations,
  doctorRelations,
  locationRelations,
  reservationRelations,
  sessionRelations,
  userRelations,
  waitingClientRelations,
} from "./relation";
import { reservation, reservationStatus } from "./reservation";
import { session } from "./session";
import { user } from "./user";
import { verification } from "./verification";
import {
  waitingClient,
  waitingClientPriority,
  waitingClientStatus,
} from "./waiting-client";

export const schemaDefinitons = {
  account,
  accountRelations,
  call,
  callRelations,
  callStatus,
  client,
  clientAvailability,
  clientRelations,
  doctor,
  doctorRelations,
  location,
  locationRelations,
  rateLimit,
  reservation,
  reservationRelations,
  reservationStatus,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
  waitingClient,
  waitingClientPriority,
  waitingClientRelations,
  waitingClientStatus,
};
