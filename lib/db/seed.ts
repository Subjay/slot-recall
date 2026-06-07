import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { call } from "./schemas/call";
import { client } from "./schemas/client";
import { doctor } from "./schemas/doctor";
import { location } from "./schemas/location";
import { reservation } from "./schemas/reservation";
import { waitingClient } from "./schemas/waiting-client";

loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL env variable couldn't be found.");
}

const postgresClient = postgres(connectionString, {
  max: 1,
  prepare: false,
});

const db = drizzle(postgresClient, {
  casing: "snake_case",
});

const firstNames = [
  "Anna",
  "Lukas",
  "Sophie",
  "Maximilian",
  "Marie",
  "Jakob",
  "Laura",
  "Paul",
  "Sarah",
  "Felix",
  "Julia",
  "David",
  "Nina",
  "Tobias",
  "Emma",
  "Leon",
  "Mia",
  "Noah",
  "Clara",
  "Elias",
];

const lastNames = [
  "Gruber",
  "Huber",
  "Bauer",
  "Wagner",
  "Mueller",
  "Schmidt",
  "Steiner",
  "Fischer",
  "Mayer",
  "Hofer",
  "Berger",
  "Wolf",
  "Schwarz",
  "Leitner",
  "Eder",
  "Pichler",
  "Weber",
  "Reiter",
  "Fuchs",
  "Koller",
];

const doctorFirstNames = [
  "Elisabeth",
  "Stefan",
  "Katharina",
  "Martin",
  "Eva",
  "Alexander",
  "Johanna",
  "Michael",
  "Theresa",
  "Florian",
];

const doctorLastNames = [
  "Bruckner",
  "Novak",
  "Schuster",
  "Klein",
  "Auer",
  "Sommer",
  "Binder",
  "Graf",
  "Haider",
  "Winter",
];

const viennaLocations = [
  ["Stephansplatz 1", [48.2085, 16.3731]],
  ["Kaerntner Strasse 12", [48.2049, 16.3707]],
  ["Mariahilfer Strasse 45", [48.1996, 16.3499]],
  ["Landstrasser Hauptstrasse 33", [48.2027, 16.3927]],
  ["Favoritenstrasse 88", [48.1764, 16.3776]],
  ["Waehringer Strasse 27", [48.2245, 16.3544]],
  ["Praterstrasse 19", [48.2152, 16.3833]],
  ["Alser Strasse 14", [48.2166, 16.3528]],
  ["Neubaugasse 52", [48.2012, 16.3494]],
  ["Taborstrasse 31", [48.2201, 16.3817]],
  ["Margaretenguertel 76", [48.1869, 16.3429]],
  ["Hietzinger Hauptstrasse 22", [48.1873, 16.2999]],
  ["Donaulaende 5", [48.2271, 16.4107]],
  ["Ottakringer Strasse 101", [48.2121, 16.3185]],
  ["Simmeringer Hauptstrasse 60", [48.1802, 16.4145]],
  ["Meidlinger Hauptstrasse 36", [48.1848, 16.3307]],
  ["Floridsdorfer Hauptstrasse 11", [48.2567, 16.4004]],
  ["Dresdner Strasse 90", [48.2353, 16.3801]],
  ["Josefstaedter Strasse 43", [48.2119, 16.3453]],
  ["Rennweg 77", [48.1914, 16.3889]],
  ["Schottenring 16", [48.2161, 16.3698]],
  ["Gumpendorfer Strasse 64", [48.1938, 16.3504]],
  ["Laxenburger Strasse 29", [48.1811, 16.3737]],
  ["Wiedner Hauptstrasse 55", [48.1919, 16.3665]],
  ["Brigittenauer Laende 24", [48.2321, 16.3712]],
  ["Donaustadtstrasse 37", [48.2329, 16.4448]],
  ["Lerchenfelder Strasse 89", [48.2048, 16.3392]],
  ["Sechshauser Strasse 18", [48.1907, 16.3321]],
  ["Hernalser Hauptstrasse 70", [48.2174, 16.3339]],
  ["Kagraner Platz 4", [48.2518, 16.4435]],
] satisfies [string, [number, number]][];

const random = (() => {
  let seed = 20260607;

  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
})();

const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];

const phoneNumber = (index: number) =>
  `+4367${String(60000000 + index * 13729).padStart(8, "0")}`;

const reservationStartDate = () => {
  const dayOffset = Math.floor(random() * 7);
  const hour = pick([8, 9, 10, 11, 13, 14, 15, 16]);
  const minute = pick([0, 15, 30, 45]);

  return new Date(2026, 5, 7 + dayOffset, hour, minute, 0, 0);
};

async function seed() {
  console.log("Seeding outbound-call demo data...");

  await db.execute(
    sql`truncate table "calls", "reservations", "clients", "doctors", "locations" restart identity cascade`,
  );

  const insertedLocations = await db
    .insert(location)
    .values(
      viennaLocations.map(([address, coordinates]) => ({
        address,
        city: "Vienna",
        coordinates,
      })),
    )
    .returning();

  const insertedClients = await db
    .insert(client)
    .values(
      Array.from({ length: 20 }, (_, index) => ({
        firstName: firstNames[index],
        lastName: lastNames[index],
        phoneNumber: phoneNumber(index + 1),
        locationId: insertedLocations[index].id,
        availability:
          index % 2 === 0 ? ("morning" as const) : ("afternoon" as const),
        rejectionRate: Number((0.05 + random() * 0.45).toFixed(2)),
      })),
    )
    .returning();

  const insertedDoctors = await db
    .insert(doctor)
    .values(
      Array.from({ length: 10 }, (_, index) => ({
        firstName: doctorFirstNames[index],
        lastName: doctorLastNames[index],
        phoneNumber: phoneNumber(index + 21),
        locationId: insertedLocations[index + 20].id,
      })),
    )
    .returning();

  await db.insert(reservation).values(
    Array.from({ length: 30 }, () => ({
      status: pick(["booked", "cancelled", "rebooked"] as const),
      startDate: reservationStartDate(),
      duration: pick([30, 45, 60, 90]),
      doctorId: pick(insertedDoctors).id,
      clientId: pick(insertedClients).id,
    })),
  );

  const callRows = insertedClients.map((insertedClient) => {
    const status = pick(["started", "ended", "voicemail"] as const);

    return {
      clientId: insertedClient.id,
      status,
      answer: status === "ended" ? true : random() > 0.45,
      reason:
        status === "voicemail"
          ? pick([
              "Left voicemail about an earlier appointment slot.",
              "No answer, voicemail message recorded.",
              "Asked client to call back for rescheduling.",
            ])
          : pick([
              "Client confirmed availability.",
              "Client requested a later callback.",
              "Client declined the offered slot.",
              null,
            ]),
    };
  });

  await db.insert(call).values(callRows);

  const waitingClientRows = insertedClients.map((insertedClient, index) => {
    const beforeJune = index < 12;

    return {
      clientId: insertedClient.id,
      callDate: new Date(
        2026,
        beforeJune ? 4 : 5,
        1 + (index % (beforeJune ? 31 : 14)),
        pick([8, 9, 10, 11, 13, 14, 15, 16]),
        pick([0, 15, 30, 45]),
        0,
        0,
      ),
      priority: pick(["high", "medium", "low"] as const),
      status: "pending" as const,
      recalled: false,
    };
  });

  await db.insert(waitingClient).values(waitingClientRows);

  console.log("Seed complete.");
  console.log(`Locations: ${insertedLocations.length}`);
  console.log(`Clients: ${insertedClients.length}`);
  console.log(`Doctors: ${insertedDoctors.length}`);
  console.log("Reservations: 30");
  console.log(`Calls: ${callRows.length}`);
  console.log(`Waiting clients: ${waitingClientRows.length}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgresClient.end();
  });
