const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getMapping() {
  const classLevels = await prisma.classLevel.findMany({ where: { system: 'ANGLOPHONE' } });
  const subjects = await prisma.subject.findMany({ where: { system: 'ANGLOPHONE' } });
  console.log('ClassLevels:', JSON.stringify(classLevels, null, 2));
  console.log('Subjects:', JSON.stringify(subjects, null, 2));
}

getMapping().finally(() => prisma.$disconnect());
