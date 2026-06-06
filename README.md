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
