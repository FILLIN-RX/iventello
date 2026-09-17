const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  // Seed ClassLevel
  const allClassLevels = [
    { code: 'FRA_PS',    name: 'Petite Section',      system: 'FRANCOPHONE', order: 1,  cycle: 'MATERNELLE', color: '#FF6B6B', icon: 'Baby' },
    { code: 'FRA_MS',    name: 'Moyenne Section',     system: 'FRANCOPHONE', order: 2,  cycle: 'MATERNELLE', color: '#FFA94D', icon: 'Baby' },
    { code: 'FRA_GS',    name: 'Grande Section',      system: 'FRANCOPHONE', order: 3,  cycle: 'MATERNELLE', color: '#FFD43B', icon: 'Baby' },
    { code: 'FRA_SIL',   name: 'SIL',                 system: 'FRANCOPHONE', order: 4,  cycle: 'PRIMAIRE',   color: '#A9E34B', icon: 'BookOpen' },
    { code: 'FRA_CP',    name: 'CP',                  system: 'FRANCOPHONE', order: 5,  cycle: 'PRIMAIRE',   color: '#69DB7C', icon: 'BookOpen' },
    { code: 'FRA_CE1',   name: 'CE1',                 system: 'FRANCOPHONE', order: 6,  cycle: 'PRIMAIRE',   color: '#38D9A9', icon: 'BookOpen' },
    { code: 'FRA_CE2',   name: 'CE2',                 system: 'FRANCOPHONE', order: 7,  cycle: 'PRIMAIRE',   color: '#20C997', icon: 'BookOpen' },
    { code: 'FRA_CM1',   name: 'CM1',                 system: 'FRANCOPHONE', order: 8,  cycle: 'PRIMAIRE',   color: '#4C6EF5', icon: 'BookOpen' },
    { code: 'FRA_CM2',   name: 'CM2',                 system: 'FRANCOPHONE', order: 9,  cycle: 'PRIMAIRE',   color: '#748FFC', icon: 'BookOpen' },
    { code: 'FRA_6E',    name: '6ème',                system: 'FRANCOPHONE', order: 10, cycle: 'SECONDAIRE_1', color: '#9775FA', icon: 'GraduationCap' },
    { code: 'FRA_5E',    name: '5ème',                system: 'FRANCOPHONE', order: 11, cycle: 'SECONDAIRE_1', color: '#B197FC', icon: 'GraduationCap' },
    { code: 'FRA_4E',    name: '4ème',                system: 'FRANCOPHONE', order: 12, cycle: 'SECONDAIRE_1', color: '#D0BFFF', icon: 'GraduationCap' },
    { code: 'FRA_3E',    name: '3ème',                system: 'FRANCOPHONE', order: 13, cycle: 'SECONDAIRE_1', color: '#E599F7', icon: 'GraduationCap' },
    { code: 'FRA_2NDE',  name: 'Seconde',             system: 'FRANCOPHONE', order: 14, cycle: 'SECONDAIRE_2', color: '#845EF7', icon: 'GraduationCap' },
    { code: 'FRA_1ERE',  name: 'Première',            system: 'FRANCOPHONE', order: 15, cycle: 'SECONDAIRE_2', color: '#7048E8', icon: 'GraduationCap' },
    { code: 'FRA_TLE',   name: 'Terminale',           system: 'FRANCOPHONE', order: 16, cycle: 'SECONDAIRE_2', color: '#5F3DC4', icon: 'GraduationCap' },
    { code: 'ANG_NUR1',  name: 'Nursery 1',           system: 'ANGLOPHONE',  order: 17, cycle: 'MATERNELLE', color: '#FF8787', icon: 'Baby' },
    { code: 'ANG_NUR2',  name: 'Nursery 2',           system: 'ANGLOPHONE',  order: 18, cycle: 'MATERNELLE', color: '#FFC078', icon: 'Baby' },
    { code: 'ANG_CL1',   name: 'Class 1',             system: 'ANGLOPHONE',  order: 19, cycle: 'PRIMAIRE',   color: '#8CE99A', icon: 'BookOpen' },
    { code: 'ANG_CL2',   name: 'Class 2',             system: 'ANGLOPHONE',  order: 20, cycle: 'PRIMAIRE',   color: '#63E6BE', icon: 'BookOpen' },
    { code: 'ANG_CL3',   name: 'Class 3',             system: 'ANGLOPHONE',  order: 21, cycle: 'PRIMAIRE',   color: '#38D9A9', icon: 'BookOpen' },
    { code: 'ANG_CL4',   name: 'Class 4',             system: 'ANGLOPHONE',  order: 22, cycle: 'PRIMAIRE',   color: '#20C997', icon: 'BookOpen' },
    { code: 'ANG_CL5',   name: 'Class 5',             system: 'ANGLOPHONE',  order: 23, cycle: 'PRIMAIRE',   color: '#12B886', icon: 'BookOpen' },
    { code: 'ANG_CL6',   name: 'Class 6',             system: 'ANGLOPHONE',  order: 24, cycle: 'PRIMAIRE',   color: '#0CA678', icon: 'BookOpen' },
    { code: 'ANG_FM1',   name: 'Form 1',              system: 'ANGLOPHONE',  order: 25, cycle: 'SECONDAIRE_1', color: '#5C7CFA', icon: 'GraduationCap' },
    { code: 'ANG_FM2',   name: 'Form 2',              system: 'ANGLOPHONE',  order: 26, cycle: 'SECONDAIRE_1', color: '#748FFC', icon: 'GraduationCap' },
    { code: 'ANG_FM3',   name: 'Form 3',              system: 'ANGLOPHONE',  order: 27, cycle: 'SECONDAIRE_1', color: '#91A7FF', icon: 'GraduationCap' },
    { code: 'ANG_FM4',   name: 'Form 4',              system: 'ANGLOPHONE',  order: 28, cycle: 'SECONDAIRE_1', color: '#A5D8FF', icon: 'GraduationCap' },
    { code: 'ANG_FM5',   name: 'Form 5',              system: 'ANGLOPHONE',  order: 29, cycle: 'SECONDAIRE_1', color: '#BAE6FD', icon: 'GraduationCap' },
    { code: 'ANG_L6',    name: 'Lower Sixth',         system: 'ANGLOPHONE',  order: 30, cycle: 'SECONDAIRE_2', color: '#F783AC', icon: 'GraduationCap' },
    { code: 'ANG_U6',    name: 'Upper Sixth',         system: 'ANGLOPHONE',  order: 31, cycle: 'SECONDAIRE_2', color: '#E64980', icon: 'GraduationCap' },
  ];
  for (const cl of allClassLevels) {
    await prisma.classLevel.upsert({
      where: { code: cl.code },
      update: {},
      create: cl
    });
  }

  // Seed Subjects
  const subjects = [
    { code: 'FRA_MATH',    name: 'Mathématiques',       system: 'FRANCOPHONE', color: '#4C6EF5' },
    { code: 'FRA_FR',      name: 'Français',            system: 'FRANCOPHONE', color: '#F06595' },
    { code: 'FRA_ANG',     name: 'Anglais',             system: 'FRANCOPHONE', color: '#E64980' },
    { code: 'FRA_SVT',     name: 'SVT',                 system: 'FRANCOPHONE', color: '#2F9E44' },
    { code: 'FRA_PC',      name: 'Physique-Chimie',     system: 'FRANCOPHONE', color: '#1971C2' },
    { code: 'FRA_HG',      name: 'Histoire-Géo',        system: 'FRANCOPHONE', color: '#E8590C' },
    { code: 'FRA_ESP',     name: 'Espagnol',            system: 'FRANCOPHONE', color: '#F59F00' },
    { code: 'FRA_ALL',     name: 'Allemand',            system: 'FRANCOPHONE', color: '#FCC419' },
    { code: 'FRA_PHILO',   name: 'Philosophie',         system: 'FRANCOPHONE', color: '#7950F2' },
    { code: 'FRA_ECONOMIE',name: 'SES',                 system: 'FRANCOPHONE', color: '#A61E4D' },
    { code: 'FRA_ICT',     name: 'ICT',                 system: 'FRANCOPHONE', color: '#1098AD' },
    { code: 'FRA_APS',     name: 'APS',                 system: 'FRANCOPHONE', color: '#1E7E34' },
    { code: 'ANG_MATH',    name: 'Mathematics',         system: 'ANGLOPHONE',  color: '#4C6EF5' },
    { code: 'ANG_ENG',     name: 'English',             system: 'ANGLOPHONE',  color: '#F06595' },
    { code: 'ANG_FR',      name: 'French',              system: 'ANGLOPHONE',  color: '#E64980' },
    { code: 'ANG_SCI',     name: 'Science',             system: 'ANGLOPHONE',  color: '#2F9E44' },
    { code: 'ANG_PHY',     name: 'Physics',             system: 'ANGLOPHONE',  color: '#1971C2' },
    { code: 'ANG_CHEM',    name: 'Chemistry',           system: 'ANGLOPHONE',  color: '#7B2D8B' },
    { code: 'ANG_BIO',     name: 'Biology',             system: 'ANGLOPHONE',  color: '#2B8A3E' },
    { code: 'ANG_HIST',    name: 'History',             system: 'ANGLOPHONE',  color: '#E8590C' },
    { code: 'ANG_GEO',     name: 'Geography',           system: 'ANGLOPHONE',  color: '#F59F00' },
    { code: 'ANG_LIT',     name: 'Literature',          system: 'ANGLOPHONE',  color: '#7950F2' },
    { code: 'ANG_ECO',     name: 'Economics',           system: 'ANGLOPHONE',  color: '#A61E4D' },
    { code: 'ANG_ICT',     name: 'ICT / Computer',      system: 'ANGLOPHONE',  color: '#1098AD' },
    { code: 'ANG_PE',      name: 'P.E.',                system: 'ANGLOPHONE',  color: '#1E7E34' },
    { code: 'ANG_CDT',     name: 'C.D.T.',              system: 'ANGLOPHONE',  color: '#AE3EC9' },
  ];
  for (const sub of subjects) {
    await prisma.subject.upsert({
      where: { code: sub.code },
      update: {},
      create: sub
    });
  }
}

seed().finally(() => prisma.$disconnect());
