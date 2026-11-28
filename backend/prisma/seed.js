require('dotenv').config();
const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const organizers = [
  {
    id: '98b486f7-c540-4f4f-b1e9-510eb7b36301',
    name: 'Goa Heritage Collective',
    email: 'heritage-collective@seed.local',
    organizationName: 'Goa Heritage Collective',
    description:
      'A community group sharing Goa’s neighbourhood histories, arts and living traditions.',
    contactInfo: 'Panaji, Goa',
  },
  {
    id: '98b486f7-c540-4f4f-b1e9-510eb7b36302',
    name: 'Konkan Kitchen Circle',
    email: 'kitchen-circle@seed.local',
    organizationName: 'Konkan Kitchen Circle',
    description:
      'Local cooks and food lovers celebrating Goan home cooking and seasonal produce.',
    contactInfo: 'Margao, Goa',
  },
  {
    id: '98b486f7-c540-4f4f-b1e9-510eb7b36303',
    name: 'Coast & Culture Goa',
    email: 'coast-culture@seed.local',
    organizationName: 'Coast & Culture Goa',
    description:
      'A volunteer-led group bringing residents together for coastal care and creative meetups.',
    contactInfo: 'Mapusa, Goa',
  },
];

function dateOffsetFromToday(offset) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

function time(value) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

const eventDetails = [
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36301',
    organizerEmail: organizers[0].email,
    title: 'Fontainhas Heritage Sketch Walk',
    description:
      'A relaxed, community-organized morning walk through Fontainhas, with time to sketch the lanes, façades and everyday details of Panaji. Bring a sketchbook; beginners are welcome.',
    category: 'Arts',
    location: 'Fontainhas, Panaji',
    imageUrl:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 12,
    startTime: '08:00',
    endTime: '11:00',
    maxAttendees: 24,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36302',
    organizerEmail: organizers[1].email,
    title: 'Goan Home Cooking: Seasonal Thali',
    description:
      'A hands-on community cooking session exploring a seasonal Goan thali, local ingredients and the stories behind family recipes. Vegetarian options will be available.',
    category: 'Food',
    location: 'Margao, Goa',
    imageUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 18,
    startTime: '10:00',
    endTime: '13:00',
    maxAttendees: 20,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36303',
    organizerEmail: organizers[2].email,
    title: 'Miramar Beach Community Clean-up',
    description:
      'Join local volunteers for a mindful morning collecting litter along the public beach and learning simple ways to reduce waste. Gloves and collection bags will be provided.',
    category: 'Community',
    location: 'Miramar Beach, Panaji',
    imageUrl:
      'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 24,
    startTime: '07:00',
    endTime: '09:00',
    maxAttendees: 60,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36304',
    organizerEmail: organizers[0].email,
    title: 'Konkani Folk Songs by the Mandovi',
    description:
      'An intimate, community-organized evening of Konkani folk songs and acoustic music by local performers. Come along to listen, sing and meet neighbours.',
    category: 'Music',
    location: 'Ribandar Promenade, Tiswadi',
    imageUrl:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 30,
    startTime: '17:30',
    endTime: '20:00',
    maxAttendees: 80,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36305',
    organizerEmail: organizers[2].email,
    title: 'Goa Makers & Technology Meetup',
    description:
      'A friendly show-and-tell for Goa-based makers, students and small-business owners. Share a project, swap practical ideas or just come curious.',
    category: 'Technology',
    location: 'Mapusa, Goa',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 36,
    startTime: '15:00',
    endTime: '18:00',
    maxAttendees: 45,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36306',
    organizerEmail: organizers[0].email,
    title: 'Old Goa Stories and Architecture Walk',
    description:
      'A small-group educational walk around Old Goa, focusing on local stories, architecture and respectful heritage visits. Comfortable walking shoes recommended.',
    category: 'Education',
    location: 'Old Goa, Ilhas',
    imageUrl:
      'https://images.unsplash.com/photo-1511108690759-009324a90311?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 42,
    startTime: '08:30',
    endTime: '11:30',
    maxAttendees: 25,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36307',
    organizerEmail: organizers[1].email,
    title: 'Mapusa Market Food Trail',
    description:
      'Explore the flavours and produce of Mapusa Market with local food enthusiasts. This guided community outing includes tastings and tips for shopping seasonally.',
    category: 'Food',
    location: 'Mapusa Municipal Market, Mapusa',
    imageUrl:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 48,
    startTime: '09:00',
    endTime: '11:30',
    maxAttendees: 18,
  },
  {
    id: 'a7e4f388-42e5-4db4-bf84-510eb7b36308',
    organizerEmail: organizers[2].email,
    title: 'Saligao Village 5K Fun Run',
    description:
      'A non-competitive community run and walk on village roads near Saligao. All paces are welcome; participants under 16 should attend with an adult.',
    category: 'Sports',
    location: 'Saligao, Bardez',
    imageUrl:
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1800&q=85',
    daysFromToday: 56,
    startTime: '06:30',
    endTime: '09:00',
    maxAttendees: 100,
  },
];

async function main() {
  const organizerIds = new Map();

  for (const organizer of organizers) {
    const { id, email, ...profile } = organizer;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id,
        email,
        ...profile,
        role: 'Organizer',
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
      },
      select: { id: true },
    });
    organizerIds.set(email, user.id);
  }

  for (const event of eventDetails) {
    const {
      daysFromToday,
      startTime,
      endTime,
      organizerEmail,
      imageUrl,
      ...details
    } = event;
    const eventDate = dateOffsetFromToday(daysFromToday);
    const registrationDeadline = dateOffsetFromToday(daysFromToday - 2);
    const data = {
      ...details,
      organizerId: organizerIds.get(organizerEmail),
      eventDate,
      registrationDeadline,
      startTime: time(startTime),
      endTime: time(endTime),
      status: 'Upcoming',
    };

    await prisma.event.upsert({
      where: { id: event.id },
      update: data,
      create: { id: event.id, ...data },
    });

    await prisma.eventImage.upsert({
      where: {
        eventId_position: { eventId: event.id, position: 0 },
      },
      update: { url: imageUrl },
      create: { eventId: event.id, position: 0, url: imageUrl },
    });
  }

  console.log(`Seeded ${organizers.length} organizers and ${eventDetails.length} Goa events.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed Goa event data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
