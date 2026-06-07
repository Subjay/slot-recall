# slot-recall
Context, we are creating a webapp to handles recalling clients whenever an appointment is cancelled for a general practitioner.

## Project installation

- npm install

.env file should have those variables setup correctly
FONIO_API_KEY="secret_pass"
AGENT_ID="agent_id"
OUTBOUND_NUMBER="phone_number"

DATABASE_URL="postgresql://[login]:[password]@localhost:5432/[database-name]"

npm run db:generate
npm run db:migrate
npm run db:seed

npm run dev

Add port 3000 to VSCode PORTS tab and make it visibility public