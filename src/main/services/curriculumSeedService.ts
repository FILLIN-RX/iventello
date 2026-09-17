import { PrismaClient } from '@prisma/client'

export function createCurriculumSeedService(prisma: PrismaClient) {
  return {
    async seedOfficialCurriculum(warehouseId?: string) {
      let seededCount = 0
      const officialBookIds = new Set<string>()

      // Ensure class levels exist
      const allClassLevels = [
        { code: 'ANG_FM1', name: 'Form 1', system: 'ANGLOPHONE', order: 25, cycle: 'SECONDAIRE_1', color: '#5C7CFA', icon: 'GraduationCap' },
        { code: 'ANG_FM2', name: 'Form 2', system: 'ANGLOPHONE', order: 26, cycle: 'SECONDAIRE_1', color: '#748FFC', icon: 'GraduationCap' },
        { code: 'ANG_FM3', name: 'Form 3', system: 'ANGLOPHONE', order: 27, cycle: 'SECONDAIRE_1', color: '#91A7FF', icon: 'GraduationCap' },
        { code: 'ANG_FM4', name: 'Form 4', system: 'ANGLOPHONE', order: 28, cycle: 'SECONDAIRE_1', color: '#A5D8FF', icon: 'GraduationCap' },
        { code: 'ANG_FM5', name: 'Form 5', system: 'ANGLOPHONE', order: 29, cycle: 'SECONDAIRE_1', color: '#BAE6FD', icon: 'GraduationCap' },
        { code: 'ANG_L6',  name: 'Lower Sixth', system: 'ANGLOPHONE', order: 30, cycle: 'SECONDAIRE_2', color: '#F783AC', icon: 'GraduationCap' },
        { code: 'ANG_U6',  name: 'Upper Sixth', system: 'ANGLOPHONE', order: 31, cycle: 'SECONDAIRE_2', color: '#E64980', icon: 'GraduationCap' },
        { code: 'FRA_SIL', name: 'SIL', system: 'FRANCOPHONE', order: 4, cycle: 'PRIMAIRE', color: '#A9E34B', icon: 'BookOpen' },
        { code: 'FRA_CP',  name: 'CP', system: 'FRANCOPHONE', order: 5, cycle: 'PRIMAIRE', color: '#69DB7C', icon: 'BookOpen' },
        { code: 'FRA_CE1', name: 'CE1', system: 'FRANCOPHONE', order: 6, cycle: 'PRIMAIRE', color: '#38D9A9', icon: 'BookOpen' },
        { code: 'FRA_CE2', name: 'CE2', system: 'FRANCOPHONE', order: 7, cycle: 'PRIMAIRE', color: '#20C997', icon: 'BookOpen' },
        { code: 'FRA_CM1', name: 'CM1', system: 'FRANCOPHONE', order: 8, cycle: 'PRIMAIRE', color: '#4C6EF5', icon: 'BookOpen' },
        { code: 'FRA_CM2', name: 'CM2', system: 'FRANCOPHONE', order: 9, cycle: 'PRIMAIRE', color: '#748FFC', icon: 'BookOpen' },
        { code: 'FRA_6E',  name: '6ème', system: 'FRANCOPHONE', order: 10, cycle: 'SECONDAIRE_1', color: '#9775FA', icon: 'GraduationCap' },
        { code: 'FRA_5E',  name: '5ème', system: 'FRANCOPHONE', order: 11, cycle: 'SECONDAIRE_1', color: '#B197FC', icon: 'GraduationCap' },
        { code: 'FRA_4E',  name: '4ème', system: 'FRANCOPHONE', order: 12, cycle: 'SECONDAIRE_1', color: '#D0BFFF', icon: 'GraduationCap' },
        { code: 'FRA_3E',  name: '3ème', system: 'FRANCOPHONE', order: 13, cycle: 'SECONDAIRE_1', color: '#E599F7', icon: 'GraduationCap' },
        { code: 'FRA_2NDE', name: 'Seconde', system: 'FRANCOPHONE', order: 14, cycle: 'SECONDAIRE_2', color: '#845EF7', icon: 'GraduationCap' },
        { code: 'FRA_1ERE', name: 'Première', system: 'FRANCOPHONE', order: 15, cycle: 'SECONDAIRE_2', color: '#7048E8', icon: 'GraduationCap' },
        { code: 'FRA_TLE',  name: 'Terminale', system: 'FRANCOPHONE', order: 16, cycle: 'SECONDAIRE_2', color: '#5F3DC4', icon: 'GraduationCap' }
      ]
      for (const cl of allClassLevels) {
        const exists = await prisma.classLevel.findUnique({ where: { code: cl.code } })
        if (!exists) {
          try { await prisma.classLevel.create({ data: cl }) } catch { /* ignore */ }
        }
      }

      // Ensure subjects exist
      const allSubjects = [
        { code: 'ANG_ENG', name: 'English', system: 'ANGLOPHONE', color: '#F06595' },
        { code: 'ANG_LIT', name: 'Literature', system: 'ANGLOPHONE', color: '#7950F2' },
        { code: 'ANG_FR', name: 'French', system: 'ANGLOPHONE', color: '#E64980' },
        { code: 'ANG_HIST', name: 'History', system: 'ANGLOPHONE', color: '#E8590C' },
        { code: 'ANG_GEO', name: 'Geography', system: 'ANGLOPHONE', color: '#F59F00' },
        { code: 'ANG_MATH', name: 'Mathematics', system: 'ANGLOPHONE', color: '#4C6EF5' },
        { code: 'ANG_PHY', name: 'Physics', system: 'ANGLOPHONE', color: '#1971C2' },
        { code: 'ANG_CHEM', name: 'Chemistry', system: 'ANGLOPHONE', color: '#7B2D8B' },
        { code: 'ANG_BIO', name: 'Biology', system: 'ANGLOPHONE', color: '#2B8A3E' },
        { code: 'ANG_ICT', name: 'ICT / Computer', system: 'ANGLOPHONE', color: '#1098AD' },
        { code: 'ANG_SCI', name: 'Science / Geology / Home Eco', system: 'ANGLOPHONE', color: '#2F9E44' },
        { code: 'ANG_ECO', name: 'Economics / Commerce', system: 'ANGLOPHONE', color: '#A61E4D' },
        { code: 'FRA_MATH', name: 'Mathématiques', system: 'FRANCOPHONE', color: '#4C6EF5' },
        { code: 'FRA_FR', name: 'Français & Littérature', system: 'FRANCOPHONE', color: '#F06595' },
        { code: 'FRA_ANG', name: 'Anglais', system: 'FRANCOPHONE', color: '#E64980' },
        { code: 'FRA_SVT', name: 'Sciences & SVTEEHB', system: 'FRANCOPHONE', color: '#2F9E44' },
        { code: 'FRA_PC', name: 'Physique-Chimie & Tech', system: 'FRANCOPHONE', color: '#1971C2' },
        { code: 'FRA_HG', name: 'Histoire-Géo & Citoyenneté', system: 'FRANCOPHONE', color: '#E8590C' },
        { code: 'FRA_PHILO', name: 'Philosophie', system: 'FRANCOPHONE', color: '#7950F2' },
        { code: 'FRA_ICT', name: 'Informatique / TIC', system: 'FRANCOPHONE', color: '#1098AD' },
        { code: 'FRA_ALL', name: 'Allemand', system: 'FRANCOPHONE', color: '#FCC419' },
        { code: 'FRA_ESP', name: 'Espagnol', system: 'FRANCOPHONE', color: '#F59F00' },
        { code: 'FRA_LATIN', name: 'Latin', system: 'FRANCOPHONE', color: '#845EF7' },
        { code: 'FRA_GREC', name: 'Grec', system: 'FRANCOPHONE', color: '#7048E8' },
        { code: 'FRA_ARABE', name: 'Arabe', system: 'FRANCOPHONE', color: '#20C997' },
        { code: 'FRA_ITAL', name: 'Italien', system: 'FRANCOPHONE', color: '#0CA678' },
        { code: 'FRA_CHIN', name: 'Chinois', system: 'FRANCOPHONE', color: '#D6336C' },
        { code: 'FRA_ART', name: 'Arts cinématographiques', system: 'FRANCOPHONE', color: '#E599F7' }
      ]
      for (const sb of allSubjects) {
        const exists = await prisma.subject.findUnique({ where: { code: sb.code } })
        if (!exists) {
          try { await prisma.subject.create({ data: sb }) } catch { /* ignore */ }
        }
      }

      // 1. Official Anglophone Curriculum (MINESEC 2026/2027)
      const officialAnglophoneBooks = [
        // FORM 1
        { classCode: 'ANG_FM1', title: 'Prime English Form 1', author: 'Egbe Besong, Mesei M.', editor: 'NMI', price: 3800, subCode: 'ANG_ENG' },
        { classCode: 'ANG_FM1', title: 'Fireside Tales', author: 'Charlie-Bey', editor: 'Peng Edition', price: 2000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM1', title: 'An Introduction to Poetry, Vol. 1', author: 'Akem H., Ngwobella M.', editor: 'Shiloh Printers', price: 1200, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM1', title: 'Clean School', author: 'Arrey Etta M.C. Bessong', editor: 'MONDOUX', price: 1000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM1', title: 'French Form 1', author: 'Dady, Sanama, Kuetche', editor: 'MONDOUX', price: 3600, subCode: 'ANG_FR' },
        { classCode: 'ANG_FM1', title: 'History for Form 1', author: 'Sabum H. Dingbobga', editor: 'Grassroots', price: 3200, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM1', title: 'Geography for Competency Development Book 1', author: 'Shey D. Edie Nnane', editor: 'Greenworld', price: 3000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_FM1', title: 'The Patriotic Citizen Book 1', author: 'Nanje N., Chop L., She', editor: 'Greenworld', price: 4000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM1', title: 'Integrated Secondary Mathematic Form 1', author: 'Ajeck K., Siepe R., W.', editor: 'Shiloh Printers', price: 3500, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM1', title: 'Prime Physics Form 1', author: 'Che Fuh, Munjam C.', editor: 'NMI', price: 3200, subCode: 'ANG_PHY' },
        { classCode: 'ANG_FM1', title: 'Elementary Chemistry for Form 1', author: 'Mbuli k., Shitteh G.', editor: 'TEWA Books', price: 3000, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_FM1', title: 'Emerging Biology Book 1', author: 'Toulack K., Diang J.', editor: 'Global Publishers', price: 3500, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM1', title: 'Computer Science for Form 1', author: 'Forndem F., Tangunu...', editor: 'Grassroots', price: 3500, subCode: 'ANG_ICT' },
        { classCode: 'ANG_FM1', title: 'Contextual Home Economics Form 1', author: 'N.M. Brino', editor: 'Grace Publisher', price: 4500, subCode: 'ANG_SCI' },

        // FORM 2
        { classCode: 'ANG_FM2', title: 'Prime English Form 2', author: 'Egbe Besong, Mesei M.', editor: 'NMI', price: 3800, subCode: 'ANG_ENG' },
        { classCode: 'ANG_FM2', title: 'Going Home', author: 'Ethel Joffi Molua E.', editor: 'NYAA Publ.', price: 2000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM2', title: 'An Introduction to Poetry, Vol.2', author: 'Akem H., Ngwobella M.', editor: 'Shiloh Printers', price: 1200, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM2', title: 'A Time to Reconcile', author: 'George Njimele', editor: 'Peacock', price: 1200, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM2', title: 'French Form 2', author: 'Dady, Sanama, Kuetche', editor: 'MONDOUX', price: 3500, subCode: 'ANG_FR' },
        { classCode: 'ANG_FM2', title: 'Basic Keystones in History Form 2', author: 'V. Kum Ngwoh', editor: 'Grace Publ.', price: 4000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM2', title: 'Geography for Competency Development 2', author: 'Shey d. Edie Nnane', editor: 'Greenworld', price: 4000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_FM2', title: 'The Advocate for Citizenship Education Form 2', author: 'Venantius Kum Ngwoh', editor: 'Grace Pub.', price: 3500, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM2', title: 'Integrated Secondary Mathematics Book 2', author: 'Ajeck K., Siepe R., W.', editor: 'Shiloh Printers', price: 3500, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM2', title: 'Physics for Secondary Schools in Cameroon Form 2', author: 'Clinton Ojong', editor: 'Longhorn', price: 3500, subCode: 'ANG_PHY' },
        { classCode: 'ANG_FM2', title: 'Integrated Secondary Chemistry Form 2', author: 'Ajeck Blaise T.', editor: 'Dominion', price: 3000, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_FM2', title: 'Emerging Biology Book 2', author: 'Toulack K., Diang J.', editor: 'Global Publ.', price: 3000, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM2', title: 'Contextual Home Economics Form 2', author: 'N.M. Brino', editor: 'Grace Publ.', price: 4500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_FM2', title: 'Computer Science for Form 2', author: 'Forndem F., Tangunu...', editor: 'Grassroots', price: 3500, subCode: 'ANG_ICT' },

        // FORM 3
        { classCode: 'ANG_FM3', title: 'Innovative English Form 3', author: 'Jator-Bangsi', editor: 'MONDOUX', price: 3600, subCode: 'ANG_ENG' },
        { classCode: 'ANG_FM3', title: 'A Pen Kills', author: 'Lucas Ntang Tasi', editor: 'NMI', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM3', title: 'My Cameroon and others Poems', author: 'Charlie Bey', editor: 'Peng Edition', price: 1800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM3', title: 'Inclusive Education: The Way to go', author: 'Douglas Achingale', editor: 'NYAA Pub.', price: 1800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM3', title: 'French Form 3', author: 'Molonta, Mounchikpou', editor: 'Africa Education', price: 3900, subCode: 'ANG_FR' },
        { classCode: 'ANG_FM3', title: 'The Essential Logic for Ordinary Level (F3)', author: 'Ngwonam Denis', editor: 'Grassroots', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM3', title: 'An Integrated History since 1850 (Forms 3, 4, 5)', author: 'Munang R.C.', editor: 'Quality Print', price: 6000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM3', title: 'New 21st Century Physical, Human and Cameroon Geography', author: 'Nchangwi S., Che B., Nchangwi P.', editor: 'Grassroots', price: 8000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_FM3', title: 'International Students\' Atlas (Forms III to V)', author: 'Patrick Wiegand', editor: 'Oxford', price: 6000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_FM3', title: 'Citizenship Education Form 3', author: 'Fandjio M., Afoni E.', editor: 'CATWA', price: 3000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM3', title: 'Contextual Food and Nutrition for Form 3', author: 'N.M. Brino', editor: 'Grace Publ', price: 4500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_FM3', title: 'Economics for GCE O Level and ITVE (F. 3, 4, 5)', author: 'Jua, Asunkeng, Bushu', editor: 'CATWA', price: 7000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_FM3', title: 'Success in Commerce (Forms 3, 4, 5)', author: 'Ajeh Mesumbe', editor: 'Grace Publ.', price: 7000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_FM3', title: 'Prime Mathematics Form 3', author: 'Tasah, Ngew, Gene', editor: 'NMI', price: 4200, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM3', title: 'Physics Form 3', author: 'Mpacko E. Ivo', editor: 'Grace Publ.', price: 4500, subCode: 'ANG_PHY' },
        { classCode: 'ANG_FM3', title: 'Understanding Chemistry (Forms 3, 4, 5)', author: 'Njike N., Funjong B.', editor: 'TEWA books', price: 6500, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_FM3', title: 'Understanding Biology Form 3', author: 'Tapong Sylvester', editor: 'Greenworld', price: 6500, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM3', title: 'Prime ICT Form 3', author: 'Agwe, Ngwa, Arrey N.', editor: 'NMI', price: 4000, subCode: 'ANG_ICT' },

        // FORM 4
        { classCode: 'ANG_FM4', title: 'Prime English, Form 4', author: 'Egbe Besong Elvis', editor: 'NMI', price: 4200, subCode: 'ANG_ENG' },
        { classCode: 'ANG_FM4', title: 'Macbeth', author: 'W. Shakespeare', editor: 'New Swan Edit.', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM4', title: 'Lord of the Flies', author: 'William Golding', editor: 'Longman', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM4', title: 'The Crown of Thorns', author: 'L.T. Asong', editor: 'Grace Publisher', price: 3500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM4', title: 'Modern Anthology of Poetry', author: 'Hans Bokwe Itoe', editor: 'Grassroots', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM4', title: 'French Form 4', author: 'Dady, Sanama, Kuetche', editor: 'MONDOUX', price: 3600, subCode: 'ANG_FR' },
        { classCode: 'ANG_FM4', title: 'The Essential Logic for Ordinary Level (F4)', author: 'Ngwonam Denis', editor: 'Grassroots', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM4', title: 'An Integrated History since 1850 (Forms 3, 4, 5)', author: 'Munang R.C.', editor: 'Quality Print', price: 6000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM4', title: 'New 21st Century Physical, Human and Cameroon Geography (F 3,4,5)', author: 'Nchangvi Sebastian', editor: 'Grassroots', price: 8000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_FM4', title: 'Basic Geology for Colleges, Forms 4 and 5', author: 'Takwi Henry', editor: 'TEWA Books', price: 5000, subCode: 'ANG_SCI' },
        { classCode: 'ANG_FM4', title: 'The Advocate for Citizenship Education (F. 4, 5)', author: 'Venantius Kum Ngwoh', editor: 'Grace Publ.', price: 4000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM4', title: 'Economics for GCE O Level and ITVE (F. 3, 4, 5)', author: 'Jua, Asunkeng, Bushu', editor: 'CATWA', price: 7000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_FM4', title: 'Success in Commerce (Forms 3, 4, 5)', author: 'Ajeh Mesumbe', editor: 'Grace Publ.', price: 7000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_FM4', title: 'Prime Mathematics (Forms 4 and 5)', author: 'Tasah, Ngew, Gene', editor: 'NMI', price: 5300, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM4', title: 'Explaining Additional Mathematics', author: 'Atanga A.', editor: 'NAARAT', price: 9000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM4', title: 'Standard Physics, Form 4', author: 'Tam P., Awandja', editor: 'Dominion', price: 5000, subCode: 'ANG_PHY' },
        { classCode: 'ANG_FM4', title: 'Understanding Chemistry (Forms 3, 4, 5)', author: 'Njike Nchopah, Funjung', editor: 'TEWA Books', price: 6500, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_FM4', title: 'Understanding Biology Vol. 1 (Forms 4, 5)', author: 'Tapong Sylvester', editor: 'Greenworld', price: 8000, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM4', title: 'Contextual Food and Nutrition (Forms 4, 5)', author: 'N.M. Brino', editor: 'Grace Pub.', price: 4500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_FM4', title: 'Understanding Biology Vol. 2 (Forms 4, 5)', author: 'Tapong Sylvester', editor: 'Greenworld', price: 6500, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM4', title: 'Computer Science Form 4', author: 'Nfor Ngala N., Fuh Che H.', editor: 'Africa Edu', price: 4500, subCode: 'ANG_ICT' },

        // FORM 5
        { classCode: 'ANG_FM5', title: 'Prime English, Form 5', author: 'Egbe Besong Elvis', editor: 'NMI', price: 4500, subCode: 'ANG_ENG' },
        { classCode: 'ANG_FM5', title: 'French Form 5', author: 'Molonta, Mounchikpou', editor: 'Africa Education', price: 4000, subCode: 'ANG_FR' },
        { classCode: 'ANG_FM5', title: 'The Essential Logic for Ordinary Level (F5)', author: 'Ngwonam Denis', editor: 'Grassroots', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM5', title: 'An Integrated History since 1850 (Forms 3, 4, 5)', author: 'Munang R.C.', editor: 'Quality Print', price: 6000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM5', title: 'Macbeth (F5)', author: 'W. Shakespeare', editor: 'New Swan Edit.', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM5', title: 'Lord of the Flies (F5)', author: 'William Golding', editor: 'Longman', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM5', title: 'The Crown of Thorns (F5)', author: 'L.T. Asong', editor: 'Grace Publisher', price: 3500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM5', title: 'Modern Anthology of Poetry (F5)', author: 'Hans Bokwe Itoe', editor: 'Grassroots', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_FM5', title: 'New 21st Century Physical, Human and Cameroon Geography (F5)', author: 'Nchangvi Sebastian', editor: 'Grassroots', price: 8000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_FM5', title: 'Basic Geology for Colleges, Forms 4 and 5 (F5)', author: 'Takwi Henry', editor: 'TEWA Books', price: 5000, subCode: 'ANG_SCI' },
        { classCode: 'ANG_FM5', title: 'The Advocate for Citizenship Education, F. 4 and 5 (F5)', author: 'Venantius Kum Ngwoh', editor: 'Grace Publ.', price: 4000, subCode: 'ANG_HIST' },
        { classCode: 'ANG_FM5', title: 'Economics for GCE O Level and ITVE (F5)', author: 'Jua, Asunkeng, Bushu', editor: 'CATWA', price: 7000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_FM5', title: 'Success in Commerce (F5)', author: 'Ajeh Mesumbe', editor: 'Grace Publ.', price: 7000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_FM5', title: 'Prime Mathematics Forms 4 and 5 (F5)', author: 'Tasah, Ngew, Gene', editor: 'NMI', price: 5300, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM5', title: 'Explaining Additional Mathematics (F5)', author: 'Atanga A.', editor: 'NAARAT', price: 9000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_FM5', title: 'Prime Physics, Form 5', author: 'Che Fuh, Munjam C.', editor: 'NMI', price: 5000, subCode: 'ANG_PHY' },
        { classCode: 'ANG_FM5', title: 'Understanding Chemistry, Forms 3, 4 and 5 (F5)', author: 'NJIKE N.', editor: 'TEWA Books', price: 6500, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_FM5', title: 'Understanding Biology Vol. 1 (F5)', author: 'Tapong Sylvester', editor: 'Greenworld', price: 8000, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM5', title: 'Understanding Biology Vol. 2 (F5)', author: 'Tapong Sylvester', editor: 'Greenworld', price: 6500, subCode: 'ANG_BIO' },
        { classCode: 'ANG_FM5', title: 'Computer Science Form 5', author: 'Montchio T., Tolefac A.', editor: 'Africa Edu', price: 5000, subCode: 'ANG_ICT' },

        // LOWER SIXTH
        { classCode: 'ANG_L6', title: 'Mastering English', author: 'Egbe Besong and others', editor: 'NMI', price: 4500, subCode: 'ANG_ENG' },
        { classCode: 'ANG_L6', title: 'Three Short Plays (The Swamp Dwellers)', author: 'Wole Soyinka', editor: 'Oxford', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Twilight of a Misty Foliage', author: 'Ben Jama', editor: 'Peng Edition', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Unanswered Cries', author: 'Osman Conteh', editor: 'Macmillan', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'The Old Man and The Sea', author: 'E. Hemingway', editor: 'Scribner', price: 2800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Cosmic Anthology To Poetry', author: 'Vainer and Kaby', editor: 'Dominion', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'A Raisin in The Sun', author: 'Lorraine Hansberry', editor: 'Vintage', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'And Palm-Wine Will Flow', author: 'Bole Butake', editor: 'Sopecam', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Nineteen Eighty Four', author: 'George Orwell', editor: 'Penguin', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Anthills of the Savannah', author: 'Chinua Achebe', editor: 'Heinemann', price: 2800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'The Lady with the Beard', author: 'Alobwede d\'Epie', editor: 'CLE', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'The General Prologue and The Merchant\'s Tale', author: 'Chaucer', editor: 'Cambridge', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Selected Poems (John Keats)', author: 'John Keats', editor: 'Dominion Publ.', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Poems of Black Africa', author: 'Wole Soyinka', editor: 'Heinemann', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Coriolanus', author: 'W. Shakespeare', editor: 'New Swan Edit.', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'A Dance of The Forest', author: 'Wole Soyinka', editor: 'Oxford', price: 2800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'A Practical Guide to Literature in English', author: 'H.L. Moody', editor: 'Longman', price: 3500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Prose and Poetry Appreciation Handbook', author: 'E. Cheng and P. Tangyie', editor: 'Presbook', price: 3500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'A Stylistic Guide to Literary Appreciation', author: 'J. Nkemngong N.', editor: 'CLE', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Apprenons le Français (Sixth)', author: 'Mbimeh Paul and others', editor: 'ANUCAM', price: 4000, subCode: 'ANG_FR' },
        { classCode: 'ANG_L6', title: 'Walaande. L\'art de partager un mari', author: 'Djaïli Amadou Amal', editor: 'Proximité', price: 3000, subCode: 'ANG_FR' },
        { classCode: 'ANG_L6', title: 'Le fils d\'Agatha Moudio', author: 'Francis Bebey', editor: 'CLE', price: 3200, subCode: 'ANG_FR' },
        { classCode: 'ANG_L6', title: 'Certified Philosophy for Cameroon GCE', author: 'Samah Abang-Mugwa', editor: 'Catwa', price: 7500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_L6', title: 'Comprehensive Advanced Level History', author: 'Venantius Kum Ngwoh', editor: 'Grace Publisher', price: 9500, subCode: 'ANG_HIST' },
        { classCode: 'ANG_L6', title: 'Complete Physical Geography for Advanced Learners', author: 'Nchangvi Sebastian Kangang', editor: 'Grassroots Publ.', price: 11000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_L6', title: 'Advanced Integrated Human Geography', author: 'Neba Martin', editor: 'Greenworld', price: 11000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_L6', title: 'Statistical Techniques in Geography for Advanced Learners', author: 'Nchangvi S. Kangang', editor: 'Grassroots Pub.', price: 4500, subCode: 'ANG_GEO' },
        { classCode: 'ANG_L6', title: 'Advanced Level Pure Mathematics Made Easy', author: 'Ewane Roland Alunge', editor: 'Grace Publ.', price: 8000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_L6', title: 'Further Pure Mathematics Made Easy', author: 'Ewane Roland Alunge', editor: 'Grace Publ.', price: 9000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_L6', title: 'Mathematics: Mechanics and Probability', author: 'L. Bostock, S. Chandler', editor: 'Oxford', price: 10000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_L6', title: 'An Integrated Core Approach Further Mechanics', author: 'Piankeh A.', editor: 'Quality Print', price: 4000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_L6', title: 'Advanced Chemistry', author: 'Clugston, R. Flemming', editor: 'Oxford', price: 15500, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_L6', title: 'Comprehensive A Level Biology: Concepts and App.', author: 'B.C. Dama', editor: 'Presbook', price: 9000, subCode: 'ANG_BIO' },
        { classCode: 'ANG_L6', title: 'Geology For Advanced Level (Main textbook)', author: 'Keneth Yoisimbom', editor: 'Grassroots', price: 8500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_L6', title: 'Panorama of Geology A Level. Practical Manual', author: 'Keneth Yoisimbom', editor: 'Grassroots', price: 2500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_L6', title: 'Advanced Level ICT Demystified', author: 'CHI Michael', editor: 'Grassroots', price: 6500, subCode: 'ANG_ICT' },
        { classCode: 'ANG_L6', title: 'Advanced Computer Science Demystified', author: 'Chi Michael', editor: 'Grassroots', price: 6500, subCode: 'ANG_ICT' },
        { classCode: 'ANG_L6', title: 'Advanced Economics', author: 'Ndichia Gerald and alii', editor: 'Destiny Print', price: 6000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_L6', title: 'Explaining Advanced Level Statistics', author: 'Napthalin A. Atanga', editor: 'Naarat Pub.', price: 10000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_L6', title: 'Advanced Level Physics: A modern Approach', author: 'Mpako Enongene Ivo', editor: 'Grace Pub.', price: 9000, subCode: 'ANG_PHY' },

        // UPPER SIXTH
        { classCode: 'ANG_U6', title: 'Mastering English (Upper Sixth)', author: 'Egbe Besong and others', editor: 'NMI', price: 4500, subCode: 'ANG_ENG' },
        { classCode: 'ANG_U6', title: 'Three Short Plays (The Swamp Dwellers)', author: 'Wole Soyinka', editor: 'Oxford', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Twilight of a Misty Foliage', author: 'Ben Jama', editor: 'Peng Edition', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Unanswered Cries', author: 'Osman Conteh', editor: 'Macmillan', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'The Old Man and The Sea', author: 'E. Hemingway', editor: 'Scribner', price: 2800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Cosmic Anthology To Poetry', author: 'Vainer and Kaby', editor: 'Dominion', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'A Raisin in The Sun', author: 'Lorraine Hansberry', editor: 'Vintage', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'And Palm-Wine Will Flow', author: 'Bole Butake', editor: 'Sopecam', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Nineteen Eighty Four', author: 'George Orwell', editor: 'Penguin', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Anthills of the Savannah', author: 'Chinua Achebe', editor: 'Heinemann', price: 2800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'The Lady with the Beard', author: 'Alobwede d\'Epie', editor: 'CLE', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'The General Prologue and The Merchant\'s Tale', author: 'Chaucer', editor: 'Cambridge', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Selected Poems (John Keats)', author: 'John Keats', editor: 'Dominion Publ.', price: 2500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Poems of Black Africa', author: 'Wole Soyinka', editor: 'Heinemann', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Coriolanus', author: 'W. Shakespeare', editor: 'New Swan Edit.', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'A Dance of The Forest', author: 'Wole Soyinka', editor: 'Oxford', price: 2800, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'A Practical Guide to Literature in English', author: 'H.L. Moody', editor: 'Longman', price: 3500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Prose and Poetry Appreciation Handbook', author: 'E. Cheng and P. Tangyie', editor: 'Presbook', price: 3500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'A Stylistic Guide to Literary Appreciation', author: 'J. Nkemngong N.', editor: 'CLE', price: 3000, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Apprenons le Français (Upper Sixth)', author: 'Mbimeh Paul and others', editor: 'ANUCAM', price: 4000, subCode: 'ANG_FR' },
        { classCode: 'ANG_U6', title: 'Walaande. L\'art de partager un mari', author: 'Djaïli Amadou Amal', editor: 'Proximité', price: 3000, subCode: 'ANG_FR' },
        { classCode: 'ANG_U6', title: 'Le fils d\'Agatha Moudio', author: 'Francis Bebey', editor: 'CLE', price: 3200, subCode: 'ANG_FR' },
        { classCode: 'ANG_U6', title: 'Certified Philosophy for Cameroon GCE (U6)', author: 'Samah Abang-Mugwa', editor: 'Catwa', price: 7500, subCode: 'ANG_LIT' },
        { classCode: 'ANG_U6', title: 'Comprehensive Advanced Level History (U6)', author: 'Venantius Kum Ngwoh', editor: 'Grace Publisher', price: 9500, subCode: 'ANG_HIST' },
        { classCode: 'ANG_U6', title: 'Complete Physical Geography for Advanced Learners (U6)', author: 'Nchangvi Sebastian Kangang', editor: 'Grassroots Publ.', price: 11000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_U6', title: 'Advanced Integrated Human Geography (U6)', author: 'Neba Martin', editor: 'Greenworld', price: 11000, subCode: 'ANG_GEO' },
        { classCode: 'ANG_U6', title: 'Statistical Techniques in Geography for Advanced Learners (U6)', author: 'Nchangvi S. Kangang', editor: 'Grassroots Pub.', price: 4500, subCode: 'ANG_GEO' },
        { classCode: 'ANG_U6', title: 'Advanced Level Pure Mathematics Made Easy (U6)', author: 'Ewane Roland Alunge', editor: 'Grace Publ.', price: 8000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_U6', title: 'Further Pure Mathematics Made Easy (U6)', author: 'Ewane Roland Alunge', editor: 'Grace Publ.', price: 9000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_U6', title: 'Mathematics: Mechanics and Probability (U6)', author: 'L. Bostock, S. Chandler', editor: 'Oxford', price: 10000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_U6', title: 'An Integrated Core Approach Further Mechanics (U6)', author: 'Piankeh A.', editor: 'Quality Print', price: 4000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_U6', title: 'Advanced Chemistry (U6)', author: 'Clugston, R. Flemming', editor: 'Oxford', price: 15500, subCode: 'ANG_CHEM' },
        { classCode: 'ANG_U6', title: 'Comprehensive A Level Biology: Concepts and App. (U6)', author: 'B.C. Dama', editor: 'Presbook', price: 9000, subCode: 'ANG_BIO' },
        { classCode: 'ANG_U6', title: 'Geology For Advanced Level (U6)', author: 'Keneth Yoisimbom', editor: 'Grassroots', price: 8500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_U6', title: 'Panorama of Geology A Level. Practical Manual (U6)', author: 'Keneth Yoisimbom', editor: 'Grassroots', price: 2500, subCode: 'ANG_SCI' },
        { classCode: 'ANG_U6', title: 'Advanced Level ICT Demystified (U6)', author: 'CHI Michael', editor: 'Grassroots', price: 6500, subCode: 'ANG_ICT' },
        { classCode: 'ANG_U6', title: 'Advanced Computer Science Demystified (U6)', author: 'Chi Michael', editor: 'Grassroots', price: 6500, subCode: 'ANG_ICT' },
        { classCode: 'ANG_U6', title: 'Advanced Economics (U6)', author: 'Ndichia Gerald and alii', editor: 'Destiny Print', price: 6000, subCode: 'ANG_ECO' },
        { classCode: 'ANG_U6', title: 'Explaining Advanced Level Statistics (U6)', author: 'Napthalin A. Atanga', editor: 'Naarat Pub.', price: 10000, subCode: 'ANG_MATH' },
        { classCode: 'ANG_U6', title: 'Advanced Level Physics: A modern Approach (U6)', author: 'Mpako Enongene Ivo', editor: 'Grace Pub.', price: 9000, subCode: 'ANG_PHY' }
      ]

      for (const item of officialAnglophoneBooks) {
        const classLevel = await prisma.classLevel.findUnique({
          where: { code: item.classCode }
        })
        if (!classLevel) continue

        const subject = await prisma.subject.findUnique({
          where: { code: item.subCode }
        })

        const existingBook = await prisma.book.findFirst({
          where: {
            title: item.title,
            classLevelId: classLevel.id
          }
        })

        let book: any
        const purchasePrice = Math.round(item.price * 0.8)

        if (existingBook) {
          book = await prisma.book.update({
            where: { id: existingBook.id },
            data: {
              author: item.author,
              editor: item.editor,
              price: item.price,
              purchasePrice: existingBook.purchasePrice || purchasePrice,
              isOfficialProgram: true,
              subjectId: subject?.id || null
            }
          })
        } else {
          book = await prisma.book.create({
            data: {
              title: item.title,
              author: item.author,
              editor: item.editor,
              price: item.price,
              purchasePrice,
              isOfficialProgram: true,
              classLevelId: classLevel.id,
              subjectId: subject?.id || null
            }
          })
        }

        if (warehouseId) {
          const existingStock = await prisma.bookStock.findFirst({
            where: {
              bookId: book.id,
              warehouseId
            }
          })

          if (existingStock) {
            await prisma.bookStock.update({
              where: { id: existingStock.id },
              data: { classLevelId: classLevel.id }
            })
          } else {
            await prisma.bookStock.create({
              data: {
                bookId: book.id,
                warehouseId,
                classLevelId: classLevel.id,
                quantity: 0,
                alertLimit: 5
              }
            })
          }
        }

        officialBookIds.add(book.id)
        seededCount++
      }

      // 2. Manuels scolaires officiels Francophones (Cameroun MINEDUB & MINESEC 2026/2027)
      const officialFrancophoneBooks = [
        // SIL
        { title: 'Champions en Mathématiques SIL', author: 'Collectif', editor: 'Edicef', price: 2800, classCode: 'FRA_SIL', subCode: 'FRA_MATH' },
        { title: 'Mon grand cahier d’écriture et de lecture SIL', author: 'NMI', editor: 'NMI Education', price: 2200, classCode: 'FRA_SIL', subCode: 'FRA_FR' },
        { title: 'Living in English Primer SIL', author: 'Cambridge / NMI', editor: 'Cambridge', price: 2500, classCode: 'FRA_SIL', subCode: 'FRA_ANG' },

        // CP
        { title: 'Champions en Mathématiques CP', author: 'Collectif', editor: 'Edicef', price: 2800, classCode: 'FRA_CP', subCode: 'FRA_MATH' },
        { title: 'Mon livre de Français CP', author: 'Afrédit', editor: 'Afrédit / Nathan', price: 3000, classCode: 'FRA_CP', subCode: 'FRA_FR' },
        { title: 'Living in English CP (Book 1)', author: 'Cambridge', editor: 'Cambridge', price: 2500, classCode: 'FRA_CP', subCode: 'FRA_ANG' },
        { title: 'Les brillants en anglais CP', author: 'NMI Education', editor: 'NMI Education', price: 1800, classCode: 'FRA_CP', subCode: 'FRA_ANG' },

        // CE1
        { title: 'Champions en Mathématiques CE1', author: 'Collectif', editor: 'Edicef', price: 3200, classCode: 'FRA_CE1', subCode: 'FRA_MATH' },
        { title: 'L’Île aux mots Français CE1', author: 'Nathan / Clé', editor: 'Nathan', price: 3400, classCode: 'FRA_CE1', subCode: 'FRA_FR' },
        { title: 'Sciences et Technologies à l’école primaire CE1', author: 'Afrédit', editor: 'Afrédit', price: 2600, classCode: 'FRA_CE1', subCode: 'FRA_SVT' },
        { title: 'Interactions in English CE1', author: 'Cambridge', editor: 'Cambridge', price: 2800, classCode: 'FRA_CE1', subCode: 'FRA_ANG' },

        // CE2
        { title: 'Champions en Mathématiques CE2', author: 'Collectif', editor: 'Edicef', price: 3200, classCode: 'FRA_CE2', subCode: 'FRA_MATH' },
        { title: 'L’Île aux mots Français CE2', author: 'Nathan / Clé', editor: 'Nathan', price: 3400, classCode: 'FRA_CE2', subCode: 'FRA_FR' },
        { title: 'Les TIC à l’école primaire CE2', author: 'White House', editor: 'White House', price: 2500, classCode: 'FRA_CE2', subCode: 'FRA_ICT' },
        { title: 'Interactions in English CE2', author: 'Cambridge', editor: 'Cambridge', price: 2800, classCode: 'FRA_CE2', subCode: 'FRA_ANG' },

        // CM1
        { title: 'Champions en Mathématiques CM1', author: 'Collectif', editor: 'Edicef', price: 3500, classCode: 'FRA_CM1', subCode: 'FRA_MATH' },
        { title: 'L’Île aux mots Français CM1', author: 'Nathan / Clé', editor: 'Nathan', price: 3600, classCode: 'FRA_CM1', subCode: 'FRA_FR' },
        { title: 'Sciences d’observation et environnement CM1', author: 'Afrédit', editor: 'Afrédit', price: 2900, classCode: 'FRA_CM1', subCode: 'FRA_SVT' },
        { title: 'Histoire et Géographie du Cameroun CM1', author: 'CEPER', editor: 'CEPER', price: 2700, classCode: 'FRA_CM1', subCode: 'FRA_HG' },

        // CM2
        { title: 'Champions en Mathématiques CM2 (Prépa Concours)', author: 'Collectif', editor: 'Edicef', price: 3500, classCode: 'FRA_CM2', subCode: 'FRA_MATH' },
        { title: 'L’Île aux mots Français CM2', author: 'Nathan / Clé', editor: 'Nathan', price: 3600, classCode: 'FRA_CM2', subCode: 'FRA_FR' },
        { title: 'Sciences d’observation et environnement CM2', author: 'Afrédit', editor: 'Afrédit', price: 2900, classCode: 'FRA_CM2', subCode: 'FRA_SVT' },
        { title: 'Histoire et Géographie du Cameroun CM2', author: 'CEPER', editor: 'CEPER', price: 2700, classCode: 'FRA_CM2', subCode: 'FRA_HG' },

        // 6ème (MINESEC 2026/2027)
        { title: 'Français 6ème', author: 'Owona, Ben Cohen', editor: 'NATHAN', price: 4200, classCode: 'FRA_6E', subCode: 'FRA_FR' },
        { title: 'Les Chants de la Forêt', author: 'Lucien Anya Noa', editor: 'AFREDIT', price: 1900, classCode: 'FRA_6E', subCode: 'FRA_FR' },
        { title: 'Les Bimanes', author: 'Séverin Cécil Abega', editor: 'EDICEF', price: 2000, classCode: 'FRA_6E', subCode: 'FRA_FR' },
        { title: 'Korotoumou', author: 'Amadou Kone', editor: 'Vallesse', price: 2200, classCode: 'FRA_6E', subCode: 'FRA_FR' },
        { title: 'Planète ANGLAIS 6ème', author: 'Ombga, Enyegue, Mbeudeu...', editor: 'Africa Education', price: 3500, classCode: 'FRA_6E', subCode: 'FRA_ANG' },
        { title: 'Latinistas 6ème_5ème', author: 'Ottou Fouda, Sabikanda...', editor: 'Eclosion', price: 5000, classCode: 'FRA_6E', subCode: 'FRA_LATIN' },
        { title: 'Planète HISTOIRE Cameroun. 6ème-5ème', author: 'Botnem, Ekollo Sono, Mvele', editor: 'Hatier-ERA', price: 4000, classCode: 'FRA_6E', subCode: 'FRA_HG' },
        { title: 'Planète GEOGRAPHIE Cameroun 6ème-5ème', author: 'Botnem, Ekollo Sono, Mvele', editor: 'EDICEF-ERA', price: 4200, classCode: 'FRA_6E', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté 6ème/5ème', author: 'Kouna Bah, Ayuk Ayuk, Ndolo', editor: 'MONDOUX', price: 3500, classCode: 'FRA_6E', subCode: 'FRA_HG' },
        { title: 'Mathématiques 6ème', author: 'Pokam, Talla Ndé, Yadaci...', editor: 'MONDOUX / Hatier-ERA', price: 5000, classCode: 'FRA_6E', subCode: 'FRA_MATH' },
        { title: 'Sciences 6ème', author: 'Bayemi, Dchinda, Essimbi...', editor: 'Africa Education', price: 4200, classCode: 'FRA_6E', subCode: 'FRA_SVT' },
        { title: 'Informatique 6ème', author: 'Jean Paul Paul, Wida Orpa', editor: 'Eclosion', price: 3500, classCode: 'FRA_6E', subCode: 'FRA_ICT' },

        // 5ème (MINESEC 2026/2027)
        { title: 'Français 5ème', author: 'Modo, Nti, Ngo Kendeg', editor: 'Africa Education', price: 4500, classCode: 'FRA_5E', subCode: 'FRA_FR' },
        { title: 'L\'Arbre Fétiche', author: 'Jean Pliya', editor: 'CLE', price: 2000, classCode: 'FRA_5E', subCode: 'FRA_FR' },
        { title: 'N\'kum-Wam, le huitième notable', author: 'David Massoma Pandong', editor: 'AFREDIT', price: 2000, classCode: 'FRA_5E', subCode: 'FRA_FR' },
        { title: 'Père inconnu', author: 'Pabe Mongo', editor: 'EDICEF/NEA', price: 2000, classCode: 'FRA_5E', subCode: 'FRA_FR' },
        { title: 'Anglais 5ème', author: 'Ombga, Enyegue, Mbeudeu...', editor: 'Africa Education', price: 4500, classCode: 'FRA_5E', subCode: 'FRA_ANG' },
        { title: 'Latinistas 6ème_5ème (5e)', author: 'Ottou Fouda, Sabikanda...', editor: 'Eclosion', price: 5000, classCode: 'FRA_5E', subCode: 'FRA_LATIN' },
        { title: 'Planète Cameroun 6ème-5ème (Histoire)', author: 'Botnem, Ekollo Sono, Mvele', editor: 'Hatier-ERA', price: 4200, classCode: 'FRA_5E', subCode: 'FRA_HG' },
        { title: 'Planète Cameroun 6ème/5ème (Géographie)', author: 'Botnem, Ekollo Sono, Mvele', editor: 'EDICEF-ERA', price: 4300, classCode: 'FRA_5E', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté 6ème/5ème (5e)', author: 'Kouna Bah, Ayuk Ayuk, Ndolo', editor: 'MONDOUX', price: 3500, classCode: 'FRA_5E', subCode: 'FRA_HG' },
        { title: 'Mathématiques 5ème', author: 'Nyanda Nkamwa, Kajoue W.', editor: 'COSMOS', price: 4200, classCode: 'FRA_5E', subCode: 'FRA_MATH' },
        { title: 'Sciences 5ème', author: 'Pouofo Nguiam, Fogha Z.', editor: 'CLE', price: 4000, classCode: 'FRA_5E', subCode: 'FRA_SVT' },
        { title: 'Informatique 5ème', author: 'Jean Paul Paul, Wida Orpa', editor: 'NMI', price: 4000, classCode: 'FRA_5E', subCode: 'FRA_ICT' },

        // 4ème (MINESEC 2026/2027)
        { title: 'Français 4ème', author: 'Enyegue, Bolda Ndaitara, Essomba, Lessomo', editor: 'Africa Education', price: 5000, classCode: 'FRA_4E', subCode: 'FRA_FR' },
        { title: 'Trois prétendants, un mari', author: 'Guillaume Oyono Mbia', editor: 'CLE', price: 2500, classCode: 'FRA_4E', subCode: 'FRA_FR' },
        { title: 'Cœur du Sahel', author: 'Djaili Amadou Amal', editor: 'Proximité', price: 2500, classCode: 'FRA_4E', subCode: 'FRA_FR' },
        { title: 'L\'attachement au sol natal', author: 'Ernest Alima', editor: 'Ifrikiya', price: 1900, classCode: 'FRA_4E', subCode: 'FRA_FR' },
        { title: 'L\'Eveil en Anglais 4ème', author: 'Proboh, Etame, Ngwang', editor: 'NMI', price: 4000, classCode: 'FRA_4E', subCode: 'FRA_ANG' },
        { title: 'Latinistas 4ème 3ème', author: 'Ottou Fouda, Sabikanda...', editor: 'Eclosion', price: 5000, classCode: 'FRA_4E', subCode: 'FRA_LATIN' },
        { title: 'Je découvre la langue grecque 4ème-3ème', author: 'Ottou Fouda, Sabikanda', editor: 'Eclosion', price: 5000, classCode: 'FRA_4E', subCode: 'FRA_GREC' },
        { title: 'J\'apprends l\'Arabe 4ème', author: 'S. Abba, M. Bachirou, M. Baba', editor: 'Wisdom Publ.', price: 3000, classCode: 'FRA_4E', subCode: 'FRA_ARABE' },
        { title: 'Planète Cameroun. 4ème (Histoire)', author: 'Botnem, Ekollo Sono, Mvele', editor: 'Hatier-ERA', price: 3700, classCode: 'FRA_4E', subCode: 'FRA_HG' },
        { title: 'Planète Cameroun 4ème (Géographie)', author: 'Botnem, Ekollo Sono, Mvele', editor: 'EDICEF-ERA', price: 4300, classCode: 'FRA_4E', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté 4ème-3ème', author: 'Kouna Bah, Ayuk Ayuk, Ndolo', editor: 'MONDOUX', price: 3500, classCode: 'FRA_4E', subCode: 'FRA_HG' },
        { title: 'Erwachen/Allemand 4ème', author: 'Mponoh, Ndam, Njeupam', editor: 'NMI', price: 4500, classCode: 'FRA_4E', subCode: 'FRA_ALL' },
        { title: 'Nueva Didactica del Español I', author: 'Habissou Bidoung, Sepulveda', editor: 'HABIBI', price: 5500, classCode: 'FRA_4E', subCode: 'FRA_ESP' },
        { title: 'Didactica del\'Italiano', author: 'Mathias H. Bikitik', editor: 'L\'Harmattan', price: 3000, classCode: 'FRA_4E', subCode: 'FRA_ITAL' },
        { title: 'J\'aime le Chinois 4ème', author: 'Nama, Tidjon, Gouelekam', editor: 'Africa Education', price: 5500, classCode: 'FRA_4E', subCode: 'FRA_CHIN' },
        { title: 'Mathématiques 4ème', author: 'Tchoutio, Tchouaffi, Bona', editor: 'Belles Lettres', price: 4500, classCode: 'FRA_4E', subCode: 'FRA_MATH' },
        { title: 'SVTEEHB 4ème', author: 'Mondoman, Ntock Beng...', editor: 'MONDOUX', price: 4000, classCode: 'FRA_4E', subCode: 'FRA_SVT' },
        { title: 'Physique, Chimie, Technologie 4ème', author: 'Tagni, Abéga, Ango', editor: 'NMI', price: 4200, classCode: 'FRA_4E', subCode: 'FRA_PC' },
        { title: 'Informatique 4ème', author: 'Jean Paul Paul, Wida Orpa', editor: 'Eclosion', price: 4000, classCode: 'FRA_4E', subCode: 'FRA_ICT' },

        // 3ème (MINESEC 2026/2027)
        { title: 'Français 3ème', author: 'Ndaitara, Essomba, Lessomo', editor: 'Africa Education', price: 5000, classCode: 'FRA_3E', subCode: 'FRA_FR' },
        { title: 'Ville cruelle', author: 'Mongo Beti', editor: 'Présence Afric.', price: 2500, classCode: 'FRA_3E', subCode: 'FRA_FR' },
        { title: 'La marmite de Koka Mbala', author: 'Guy Menga', editor: 'CLE', price: 1700, classCode: 'FRA_3E', subCode: 'FRA_FR' },
        { title: 'Petites gouttes de chant pour créer l\'homme', author: 'René Philombe', editor: 'CLE', price: 2000, classCode: 'FRA_3E', subCode: 'FRA_FR' },
        { title: 'L\'Eveil en Anglais 3ème', author: 'Proboh, Etame, Ngwang', editor: 'NMI', price: 4500, classCode: 'FRA_3E', subCode: 'FRA_ANG' },
        { title: 'Latinistas 4ème 3ème (3e)', author: 'Ottou Fouda, Sabikanda...', editor: 'Eclosion', price: 5000, classCode: 'FRA_3E', subCode: 'FRA_LATIN' },
        { title: 'Je découvre la langue grecque 4ème-3ème (3e)', author: 'Ottou Fouda, Sabikanda...', editor: 'Eclosion', price: 5000, classCode: 'FRA_3E', subCode: 'FRA_GREC' },
        { title: 'J\'apprends l\'Arabe 3ème', author: 'S. Abba, M. Bachirou, M. Baba', editor: 'Wisdom Publ.', price: 3000, classCode: 'FRA_3E', subCode: 'FRA_ARABE' },
        { title: 'Planète Cameroun. 3ème (Histoire)', author: 'Botnem, Ekollo Sono, Mvele', editor: 'Hatier-ERA', price: 3700, classCode: 'FRA_3E', subCode: 'FRA_HG' },
        { title: 'Planète Cameroun 3ème (Géographie)', author: 'Botnem, Ekollo Sono, Mvele', editor: 'EDICEF-ERA', price: 4300, classCode: 'FRA_3E', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté 4ème (3e)', author: 'Kouna Bah et autres', editor: 'MONDOUX', price: 3500, classCode: 'FRA_3E', subCode: 'FRA_HG' },
        { title: 'Erwachen/Allemand 3ème', author: 'Mponoh, Ndam, Njeupam', editor: 'NMI', price: 4500, classCode: 'FRA_3E', subCode: 'FRA_ALL' },
        { title: 'Nueva Didactica Del Español 2', author: 'Habissou Bidoung, Sepulveda', editor: 'HABIBI', price: 5500, classCode: 'FRA_3E', subCode: 'FRA_ESP' },
        { title: 'Didactica Del\'Italiano (3e)', author: 'Mathias H. Bikitik', editor: 'L\'Harmattan', price: 3500, classCode: 'FRA_3E', subCode: 'FRA_ITAL' },
        { title: 'J\'aime le Chinois, 3ème', author: 'Nama, Tidjon, Gouelekam', editor: 'Africa Education', price: 4000, classCode: 'FRA_3E', subCode: 'FRA_CHIN' },
        { title: 'Mathématiques 3ème', author: 'Djapa Oumbo, Nguele', editor: 'D and L', price: 4500, classCode: 'FRA_3E', subCode: 'FRA_MATH' },
        { title: 'SVTEEHB 3ème', author: 'Bayemi, Dchinda...', editor: 'Africa Education', price: 5000, classCode: 'FRA_3E', subCode: 'FRA_SVT' },
        { title: 'Physique, Chimie, Technologie 3ème', author: 'Nsa, Peha, Heumou, Kesso', editor: 'Wisdom', price: 4500, classCode: 'FRA_3E', subCode: 'FRA_PC' },
        { title: 'Informatique 3ème', author: 'Jean Paul Paul, Wida Orpa', editor: 'Eclosion', price: 4000, classCode: 'FRA_3E', subCode: 'FRA_ICT' },

        // 2nde (MINESEC 2026/2027)
        { title: 'L\'Excellence en philosophie (2nde)', author: 'Tiako Youadjeu, Miyoupo', editor: 'NMI', price: 4000, classCode: 'FRA_2NDE', subCode: 'FRA_PHILO' },
        { title: 'Langue et Méthode au 2nde cycle (2nde)', author: 'Lessomo Edene et alii', editor: 'Africa Education', price: 5000, classCode: 'FRA_2NDE', subCode: 'FRA_FR' },
        { title: 'Les Tribus de Capitoline', author: 'P.C. Ombete Bela', editor: 'CLE', price: 3000, classCode: 'FRA_2NDE', subCode: 'FRA_FR' },
        { title: 'Poèmes sauvages éclairés au feu de brousse', author: 'Henri Nkoumo', editor: 'Les Classiques iv.', price: 1700, classCode: 'FRA_2NDE', subCode: 'FRA_FR' },
        { title: 'Tartuffe', author: 'Molière', editor: 'Belles Lettres', price: 2000, classCode: 'FRA_2NDE', subCode: 'FRA_FR' },
        { title: 'Interactions in English (2nde)', author: 'Dorothy Forbin et alii', editor: 'CAMBRIDGE', price: 5000, classCode: 'FRA_2NDE', subCode: 'FRA_ANG' },
        { title: 'Le Monde. De la préhistoire au Moyen-Age (Histoire 2nde)', author: 'Daniel Abwa, S. MANI NOAH', editor: 'CLE', price: 4000, classCode: 'FRA_2NDE', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté et à la morale (2nde)', author: 'Kouna Bah Jean Didier et alii', editor: 'MONDOUX', price: 3000, classCode: 'FRA_2NDE', subCode: 'FRA_HG' },
        { title: 'IHR und WIR Plus 3', author: 'Moussa Anouma et autres', editor: 'HUEBER', price: 6000, classCode: 'FRA_2NDE', subCode: 'FRA_ALL' },
        { title: 'Nueva Didactica del Español III', author: 'Habissou Bidoung et autres', editor: 'HABIBI', price: 4900, classCode: 'FRA_2NDE', subCode: 'FRA_ESP' },
        { title: 'Bonjour Cameroun 3', author: 'Didier Nama', editor: 'D&L', price: 3500, classCode: 'FRA_2NDE', subCode: 'FRA_CHIN' },
        { title: 'L\'Excellence en Mathématiques (2nde A et SES)', author: 'V. Tegninko Valentin et autres', editor: 'NMI', price: 4500, classCode: 'FRA_2NDE', subCode: 'FRA_MATH' },
        { title: 'Sciences (2nde A et SES)', author: 'Fogha, Pouofo et autres', editor: 'CLE', price: 3500, classCode: 'FRA_2NDE', subCode: 'FRA_SVT' },
        { title: 'L\'Excellence en Informatique (2nde)', author: 'Badane Djonwajar et al.', editor: 'NMI', price: 3100, classCode: 'FRA_2NDE', subCode: 'FRA_ICT' },
        { title: 'L\'Excellence en Mathématiques (2nde C et E)', author: 'Tegninko V., Sienlinou D.', editor: 'NMI', price: 5500, classCode: 'FRA_2NDE', subCode: 'FRA_MATH' },
        { title: 'SVTEEHB (2nde C et E)', author: 'Fogha, Pouofo et autres', editor: 'CLE', price: 5000, classCode: 'FRA_2NDE', subCode: 'FRA_SVT' },
        { title: 'L\'Excellence en Physique-Chimie (2nde C et E)', author: 'Ango Yves P., Tagni Jérémie...', editor: 'NMI', price: 6000, classCode: 'FRA_2NDE', subCode: 'FRA_PC' },
        { title: 'Initiation aux Arts cinématographiques (2nde AC)', author: 'F.N. Bikoï, Basseck Ba Kobhio', editor: 'Terre Africaine', price: 5000, classCode: 'FRA_2NDE', subCode: 'FRA_ART' },

        // 1ères (MINESEC 2026/2027)
        { title: 'Langue et Méthode au 2nde cycle (1ère)', author: 'Lessomo Edene et autres', editor: 'AFRIC\'EDUC', price: 5000, classCode: 'FRA_1ERE', subCode: 'FRA_FR' },
        { title: 'Au Cœur des ténèbres', author: 'Joseph Conrad', editor: 'Eclosion', price: 1900, classCode: 'FRA_1ERE', subCode: 'FRA_FR' },
        { title: 'Balafon', author: 'Engelbert Mveng', editor: 'CLE', price: 1800, classCode: 'FRA_1ERE', subCode: 'FRA_FR' },
        { title: 'Le Lion et la perle', author: 'Wole Soyinka', editor: 'CLE', price: 1700, classCode: 'FRA_1ERE', subCode: 'FRA_FR' },
        { title: 'Philosophie. 1ères littéraires', author: 'Foumane Josué D. et autres', editor: 'MONDOUX', price: 4500, classCode: 'FRA_1ERE', subCode: 'FRA_PHILO' },
        { title: 'Philosophie 1ères Scientifiques', author: 'Foumane Josué D. et autres', editor: 'MONDOUX', price: 4500, classCode: 'FRA_1ERE', subCode: 'FRA_PHILO' },
        { title: 'Interactions in English (1ère)', author: 'Dorothy Forbin and others', editor: 'CAMBRIDGE', price: 3000, classCode: 'FRA_1ERE', subCode: 'FRA_ANG' },
        { title: 'Le Monde. De la fin du XVIè siècle à 1939 (Histoire 1ère)', author: 'Daniel Abwa et S. Mani Noah', editor: 'CLE', price: 4500, classCode: 'FRA_1ERE', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté 1ères', author: 'Kouna Bah Jean et autres', editor: 'MONDOUX', price: 3000, classCode: 'FRA_1ERE', subCode: 'FRA_HG' },
        { title: 'Deutsch in Africa (1ère)', author: 'Ebissemie Marthe', editor: 'ABID', price: 5900, classCode: 'FRA_1ERE', subCode: 'FRA_ALL' },
        { title: 'Nueva Didactica del Español IV', author: 'Habissou Bidoung....', editor: 'HABIBI', price: 5000, classCode: 'FRA_1ERE', subCode: 'FRA_ESP' },
        { title: 'Bonjour Cameroun 4 (1ère)', author: 'Didier Nama', editor: 'D&L', price: 3500, classCode: 'FRA_1ERE', subCode: 'FRA_CHIN' },
        { title: 'Majors en Mathématiques (1ère A et SES)', author: 'Nkeng Essombo et autres', editor: 'ASVA', price: 3500, classCode: 'FRA_1ERE', subCode: 'FRA_MATH' },
        { title: 'SCIENCES (1ère A et SES)', author: 'Fogha V. J. et autres', editor: 'CLE', price: 5000, classCode: 'FRA_1ERE', subCode: 'FRA_SVT' },
        { title: 'A la conquête de l\'Informatique, 1ères', author: 'Wambo, Kotto et Temgoua', editor: 'R. LUSTRAL', price: 3400, classCode: 'FRA_1ERE', subCode: 'FRA_ICT' },
        { title: 'L\'Excellence en Mathématiques (1ère C et E)', author: 'Tegninko et autres', editor: 'NMI', price: 6500, classCode: 'FRA_1ERE', subCode: 'FRA_MATH' },
        { title: 'L\'Excellence en SVTEEHB 1ère C TI et E', author: 'Victor...', editor: 'NMI', price: 6500, classCode: 'FRA_1ERE', subCode: 'FRA_SVT' },
        { title: 'L\'Excellence en Physique 1ère C et D', author: 'Tagni Jérémie, Ango Yves...', editor: 'NMI', price: 5000, classCode: 'FRA_1ERE', subCode: 'FRA_PC' },
        { title: 'L\'Excellence en Chimie (1ère)', author: 'Ango Yves, Abega F. et autres', editor: 'NMI', price: 4500, classCode: 'FRA_1ERE', subCode: 'FRA_PC' },
        { title: 'A la conquête de l\'Informatique (1ère C, E, D, TI)', author: 'Wambo, Kotto et Temgoua', editor: 'R. LUSTRAL', price: 3600, classCode: 'FRA_1ERE', subCode: 'FRA_ICT' },
        { title: 'Mathématiques 1ère D et TI', author: 'Nkeng Essombo et autres', editor: 'CEPER', price: 5500, classCode: 'FRA_1ERE', subCode: 'FRA_MATH' },
        { title: 'SVTEEHB (1ère D et TI)', author: 'Fogha Zaboue, Mbia Ombolo', editor: 'CLE', price: 6500, classCode: 'FRA_1ERE', subCode: 'FRA_SVT' },

        // Terminales (MINESEC 2026/2027)
        { title: 'Langue et méthode au 2nd cycle (Tle)', author: 'Lessomo Edene et autres', editor: 'AFRIC\'EDUC', price: 5000, classCode: 'FRA_TLE', subCode: 'FRA_FR' },
        { title: 'Stances et poèmes suivi de Les Epreuves', author: 'Sully Prudhomme', editor: 'Eclosion', price: 1900, classCode: 'FRA_TLE', subCode: 'FRA_FR' },
        { title: 'Le Vieux nègre et la médaille (Tle)', author: 'Ferdinand Oyono', editor: 'EDICEF', price: 2500, classCode: 'FRA_TLE', subCode: 'FRA_FR' },
        { title: 'Ngum a Jemea. La foi inébranlable de...', author: 'David Mbanga Eyombwan', editor: 'CICD', price: 3000, classCode: 'FRA_TLE', subCode: 'FRA_FR' },
        { title: 'Interaction in English (Tle)', author: 'Dorothy Forbin and others', editor: 'CAMBRIDGE', price: 5000, classCode: 'FRA_TLE', subCode: 'FRA_ANG' },
        { title: 'Histoire Tle', author: 'Kouna Bah, Ayuk Ayuk.........', editor: 'MONDOUX', price: 5000, classCode: 'FRA_TLE', subCode: 'FRA_HG' },
        { title: 'Education à la citoyenneté et à la morale (Tle)', author: 'Kouna Bah Jean D. et autres', editor: 'MONDOUX', price: 3900, classCode: 'FRA_TLE', subCode: 'FRA_HG' },
        { title: 'Allemand: Ihr und Wir Plus 4', author: 'Moussa Anouma et autres', editor: 'HUEBER', price: 5000, classCode: 'FRA_TLE', subCode: 'FRA_ALL' },
        { title: 'Nueva Didactica Del Español V', author: 'Habissou Bidoung et Félix S.', editor: 'HABIBI', price: 6000, classCode: 'FRA_TLE', subCode: 'FRA_ESP' },
        { title: 'Piacere! Niveau 4/B1 (Italien Tle)', author: 'Alexandra R. Martinez', editor: 'BELIN', price: 6000, classCode: 'FRA_TLE', subCode: 'FRA_ITAL' },
        { title: 'Bonjour Cameroun 4 (Tle)', author: 'Didier Nama', editor: 'D&L', price: 3500, classCode: 'FRA_TLE', subCode: 'FRA_CHIN' },
        { title: 'Emergeons en Philosophie. Tles littéraires', author: 'Eboni, Nguefack et Ambomo', editor: 'MONDOUX', price: 7800, classCode: 'FRA_TLE', subCode: 'FRA_PHILO' },
        { title: 'Majors en Philosophie. Tles SES', author: 'Foumane, Ombede A. et alii', editor: 'ASVA', price: 5000, classCode: 'FRA_TLE', subCode: 'FRA_PHILO' },
        { title: 'De la médiocrité à l\'excellence', author: 'Ebénézer Njoh Mouelle', editor: 'CLE', price: 3000, classCode: 'FRA_TLE', subCode: 'FRA_PHILO' },
        { title: 'Essai sur la problématique philosophique en Afrique', author: 'Marcien Towa', editor: 'CLE', price: 1800, classCode: 'FRA_TLE', subCode: 'FRA_PHILO' },
        { title: 'Majors en Mathématiques (Tle A et SES)', author: 'Elandi E. R., Fouda S., Nkoule', editor: 'ASVA', price: 3900, classCode: 'FRA_TLE', subCode: 'FRA_MATH' },
        { title: 'A la conquête de l\'Informatique, 7 (Tle A et SES)', author: 'Wambo, Momnougui et alii', editor: 'R. LUSTRAL', price: 3500, classCode: 'FRA_TLE', subCode: 'FRA_ICT' },
        { title: 'L\'Excellence en Sciences (Tle A et SES)', author: 'Ebang Ehole et autres', editor: 'NMI', price: 4000, classCode: 'FRA_TLE', subCode: 'FRA_SVT' },
        { title: 'Emergeons en Philosophie. Tles C et D', author: 'Nguekack, Eboni et Ambomo', editor: 'MONDOUX', price: 5000, classCode: 'FRA_TLE', subCode: 'FRA_PHILO' },
        { title: 'Emergeons en Mathématiques (Tles C et E)', author: 'Pokam, Talla Nde et Ndjip N.', editor: 'MONDOUX', price: 6000, classCode: 'FRA_TLE', subCode: 'FRA_MATH' },
        { title: 'Emergeons en Mathématiques (Tles D et TI)', author: 'Pokam, Talla Nde et Ndjip Njoumbe', editor: 'MONDOUX', price: 5500, classCode: 'FRA_TLE', subCode: 'FRA_MATH' },
        { title: 'L\'Excellence en Physique (Tles C, D, E, TI)', author: 'Ango Y., Tagni J et autres', editor: 'NMI', price: 6500, classCode: 'FRA_TLE', subCode: 'FRA_PC' },
        { title: 'Chimie Terminales C, D et E', author: 'Ango Y., Abega F. et autres', editor: 'NMI', price: 5500, classCode: 'FRA_TLE', subCode: 'FRA_PC' },
        { title: 'SVTEEHB, Tles C et TI', author: 'Essimbi Ngono, Mbarga P.', editor: 'NMI', price: 6500, classCode: 'FRA_TLE', subCode: 'FRA_SVT' },
        { title: 'SVTEEHB, Tle D', author: 'Fogha et Pouofo', editor: 'MONDOUX', price: 8000, classCode: 'FRA_TLE', subCode: 'FRA_SVT' },
        { title: 'A la conquête de l\'Informatique, 7 (Tles C, D, E, TI)', author: 'Wambo, Momnougui et T.', editor: 'R. LUSTRAL', price: 3900, classCode: 'FRA_TLE', subCode: 'FRA_ICT' }
      ]

      for (const item of officialFrancophoneBooks) {
        const classLevel = await prisma.classLevel.findUnique({
          where: { code: item.classCode }
        })
        if (!classLevel) continue

        const subject = await prisma.subject.findUnique({
          where: { code: item.subCode }
        })

        const existingBook = await prisma.book.findFirst({
          where: {
            title: item.title,
            classLevelId: classLevel.id
          }
        })

        let book: any
        const purchasePrice = Math.round(item.price * 0.8)

        if (existingBook) {
          book = await prisma.book.update({
            where: { id: existingBook.id },
            data: {
              author: item.author,
              editor: item.editor,
              price: item.price,
              purchasePrice: existingBook.purchasePrice || purchasePrice,
              isOfficialProgram: true,
              subjectId: subject?.id || null
            }
          })
        } else {
          book = await prisma.book.create({
            data: {
              title: item.title,
              author: item.author,
              editor: item.editor,
              price: item.price,
              purchasePrice,
              isOfficialProgram: true,
              classLevelId: classLevel.id,
              subjectId: subject?.id || null
            }
          })
        }

        if (warehouseId) {
          const existingStock = await prisma.bookStock.findFirst({
            where: {
              bookId: book.id,
              warehouseId
            }
          })

          if (existingStock) {
            await prisma.bookStock.update({
              where: { id: existingStock.id },
              data: { classLevelId: classLevel.id }
            })
          } else {
            await prisma.bookStock.create({
              data: {
                bookId: book.id,
                warehouseId,
                classLevelId: classLevel.id,
                quantity: 0,
                alertLimit: 5
              }
            })
          }
        }

        officialBookIds.add(book.id)
        seededCount++
      }

      // Règle stricte pour le secondaire :
      // Seuls les livres officiellement déclarés dans le référentiel MINESEC ci-dessus sont "au programme" (isOfficialProgram = true).
      // Tous les autres livres associés aux classes du secondaire (notamment importés par Excel) sont marqués comme Hors Programme (isOfficialProgram = false).
      const secondaryClassLevels = await prisma.classLevel.findMany({
        where: {
          cycle: { in: ['SECONDAIRE_1', 'SECONDAIRE_2'] }
        },
        select: { id: true }
      })
      const secondaryClassLevelIds = secondaryClassLevels.map(c => c.id)

      if (secondaryClassLevelIds.length > 0) {
        await prisma.book.updateMany({
          where: {
            classLevelId: { in: secondaryClassLevelIds },
            id: { notIn: Array.from(officialBookIds) }
          },
          data: {
            isOfficialProgram: false
          }
        })
      }

      return { success: true, count: seededCount }
    }
  }
}
