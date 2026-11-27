CREATE TABLE "EventImage" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventImage_eventId_idx" ON "EventImage"("eventId");
CREATE UNIQUE INDEX "EventImage_eventId_position_key"
ON "EventImage"("eventId", "position");

ALTER TABLE "EventImage"
ADD CONSTRAINT "EventImage_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
