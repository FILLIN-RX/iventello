const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function importAll() {
  const files = ['books_form1.json', 'books_form2.json', 'books_form3.json', 'books_form4.json', 'books_form5.json', 'books_sixth.json'];
  
  for (const file of files) {
    console.log(`Importing ${file}...`);
    const books = JSON.parse(fs.readFileSync(`data/${file}`, 'utf8'));

    for (const book of books) {
      const classLevel = await prisma.classLevel.findUnique({ where: { code: book.classLevelCode } });
      const subject = await prisma.subject.findUnique({ where: { code: book.subjectCode } });

      if (!classLevel || !subject) {
        console.error(`Skipping ${book.title}: missing classLevel (${book.classLevelCode}) or subject (${book.subjectCode})`);
        continue;
      }

      try {
        await prisma.book.create({
          data: {
            title: book.title,
            author: book.author || null,
            editor: book.publisher || null,
            price: book.price || 0,
            classLevelId: classLevel.id,
            subjectId: subject.id
          }
        });
        console.log(`Importé: ${book.title}`);
      } catch (e) {
        if (e.code === 'P2002') {
          console.log(`Doublon ignoré: ${book.title}`);
        } else {
          console.error(`Erreur sur ${book.title}:`, e.message);
        }
      }
    }
  }
}

importAll().finally(() => prisma.$disconnect());
