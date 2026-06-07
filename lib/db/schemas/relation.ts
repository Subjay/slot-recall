import { relations } from "drizzle-orm";

import { account } from "./account";
import { call } from "./call";
import { client } from "./client";
import { doctor } from "./doctor";
import { location } from "./location";
import { reservation } from "./reservation";
import { session } from "./session";
import { user } from "./user";
import { waitingClient } from "./waiting-client";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const locationRelations = relations(location, ({ many }) => ({
  clients: many(client),
  doctors: many(doctor),
}));

export const clientRelations = relations(client, ({ one, many }) => ({
  location: one(location, {
    fields: [client.locationId],
    references: [location.id],
  }),
  calls: many(call),
  reservations: many(reservation),
  waitingClients: many(waitingClient),
}));

export const doctorRelations = relations(doctor, ({ one, many }) => ({
  location: one(location, {
    fields: [doctor.locationId],
    references: [location.id],
  }),
  reservations: many(reservation),
}));

export const reservationRelations = relations(reservation, ({ one }) => ({
  doctor: one(doctor, {
    fields: [reservation.doctorId],
    references: [doctor.id],
  }),
  client: one(client, {
    fields: [reservation.clientId],
    references: [client.id],
  }),
}));

export const callRelations = relations(call, ({ one }) => ({
  client: one(client, {
    fields: [call.clientId],
    references: [client.id],
  }),
}));

export const waitingClientRelations = relations(waitingClient, ({ one }) => ({
  client: one(client, {
    fields: [waitingClient.clientId],
    references: [client.id],
  }),
}));
