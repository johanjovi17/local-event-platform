CREATE TABLE "Registration" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "registeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Registration_userId_eventId_key"
ON "Registration"("userId", "eventId");

CREATE INDEX "Registration_eventId_idx"
ON "Registration"("eventId");

ALTER TABLE "Registration"
ADD CONSTRAINT "Registration_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Registration"
ADD CONSTRAINT "Registration_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
