<<<<<<< HEAD
# slot-recall
Context, we are creating a webapp to handles recalling clients whenever an appointment is cancelled for a general practitioner.

# Front :
## Calendar UI (Fake or not if time) with slots and at least one that we can cancel.

## Dashboard UI for the receptionist.
Which persons are beeing called, have been called.
Who said Yes, who said No, who have received a voicemail.
Live Calendar with available slots.

## Weekly Charts Dashboard

Whatever we can do from this list :
 - refill rate
 - revenue recovered
 - attempts per slot
 - outcomes by reason

# Backend :

## AI calls
### Phone calls

- Connect webapp to fonio's APIs.
- Handle the consent for the outbound call.

### Speech to Text and Text to Speech
- Needs to understand Yes/No answers.
- If client doesn't respond right away and there isn't another on the waiting list : leave a voicemal Else : next call on the waiting list.


## Waiting list choosing algorithm

- First in First out.
- Geolocation.
- Client's doctor preferences.
- Client's time preference (for when to be called).
- If already been called in the same day or not.
- Reliability when called.
- Ask to be reached by phone or email.

## Database

Clients infos
Waiting List
Doctors infos
=======
# Slot Recall

A local Sites-compatible prototype for a practice team dashboard that watches
appointment cancellations and routes open slots to an AI voice refill flow.

## Current Scope

- Mocked dashboard data only
- Four operational metrics at the top of the screen
- Static current waitlist preview
- Single calendar view from 7:00 to 22:00 with variable appointment lengths
- Manual appointment cancellation that keeps the slot visible, marks it red, and
  does not trigger backend or phone-call behavior yet
- Dashboard, calendar, and insights navigation views

## Prerequisites

- Node.js `>=22.13.0`

## Local Run

```bash
npm install
npm run dev
```

## Validation

```bash
npm run build
```

Backend persistence and the real fonio integration are intentionally left out.
The current state is kept in client-side mock data so the interaction model is
easy to replace later.
>>>>>>> fac9a9d (Build slot recall dashboard prototype)
