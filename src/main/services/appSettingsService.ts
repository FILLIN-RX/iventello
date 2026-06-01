import { PrismaClient } from '@prisma/client'

export function createAppSettingsService(prisma: PrismaClient) {
  return {
    async get() {
      let settings = await prisma.appSettings.findFirst()
      if (!settings) {
        settings = await prisma.appSettings.create({ data: { companyName: 'Mon Entreprise' } })
      }
      return settings
    },

    async update(data: {
      companyName?: string
      companyNui?: string | null
      companyBp?: string | null
      companyAddress?: string | null
      companyPhones?: string | null
      companyEmail?: string | null
      companyLogo?: string | null
      companyDescription?: string | null
      invoiceFooter?: string | null
    }) {
      let settings = await prisma.appSettings.findFirst()
      if (!settings) {
        settings = await prisma.appSettings.create({ data: { companyName: 'Mon Entreprise', ...data } })
      } else {
        settings = await prisma.appSettings.update({ where: { id: settings.id }, data })
      }
      return settings
    }
  }
}
