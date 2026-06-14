import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const module1 = await prisma.module.upsert({
    where: { id: "module-isl-basics" },
    update: {},
    create: {
      id: "module-isl-basics",
      title: "ISL Basics",
      description: "Learn the fundamentals of Indian Sign Language",
      language: "isl",
      level: "beginner",
      order: 1,
    },
  });

  const lessons = [
    { id: "lesson-1", title: "Greetings", content: "Learn hello, namaste, and good morning in ISL", signGloss: "HELLO", order: 1 },
    { id: "lesson-2", title: "Numbers 1-10", content: "Count from 1 to 10 using ISL hand shapes", signGloss: "ONE TWO THREE", order: 2 },
    { id: "lesson-3", title: "Family Signs", content: "Signs for mother, father, brother, sister", signGloss: "MOTHER FATHER", order: 3 },
    { id: "lesson-4", title: "Colors", content: "Learn colors in ISL", signGloss: "RED BLUE GREEN", order: 4 },
    { id: "lesson-5", title: "Days of the Week", content: "Monday through Sunday in ISL", signGloss: "MONDAY TUESDAY", order: 5 },
  ];

  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: { ...lesson, moduleId: module1.id },
    });
  }

  console.info("Database seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
