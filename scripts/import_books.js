const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function importBooks() {
  const books = JSON.parse(fs.readFileSync('data/books_form1.json', 'utf8'));

  for (const book of books) {
    const classLevel = await prisma.classLevel.findUnique({ where: { code: book.classLevelCode } });
    const subject = await prisma.subject.findUnique({ where: { code: book.subjectCode } });

    if (!classLevel || !subject) {
      console.error(`Skipping ${book.title}: missing classLevel (${book.classLevelCode}) or subject (${book.subjectCode})`);
      continue;
    }

    await prisma.book.upsert({
      where: { title_classLevelId: { title: book.title, classLevelId: classLevel.id } },
      update: {
        price: book.price,
        author: book.author,
        editor: book.publisher,
      },
      create: {
        title: book.title,
        author: book.author,
        editor: book.publisher,
        price: book.price,
        classLevelId: classLevel.id,
        subjectId: subject.id
      }
    });
    console.log(`Imported: ${book.title}`);
  }
}

importBooks().finally(() => prisma.$disconnect());
