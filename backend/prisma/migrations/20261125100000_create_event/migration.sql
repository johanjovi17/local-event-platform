CREATE TYPE "EventCategory" AS ENUM (
    'Music',
    'Technology',
    'Arts',
    'Sports',
    'Food',
    'Business',
    'Education',
    'Community',
    'Other'
);

CREATE TYPE "EventStatus" AS ENUM (
    'Upcoming',
    'Ongoing',
    'Completed',
    'Cancelled'
);

CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "eventDate" DATE NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "maxAttendees" INTEGER NOT NULL,
    "registrationDeadline" DATE NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'Upcoming',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
