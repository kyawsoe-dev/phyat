import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const tiers = await Promise.all([
    prisma.tier.upsert({
      where: { code: 'FREE' },
      update: {
        name: 'Free',
        maxLinks: 5,
        priceMonthly: 0,
        priceAnnual: 0,
        description: 'Get started with essential link management tools',
        features: [
          '5 links per month',
          'Custom aliases',
          'QR codes',
          'Password protection',
          'Basic analytics',
        ],
      },
      create: {
        id: 'tier_free',
        code: 'FREE',
        name: 'Free',
        maxLinks: 5,
        priceMonthly: 0,
        priceAnnual: 0,
        description: 'Get started with essential link management tools',
        features: [
          '5 links per month',
          'Custom aliases',
          'QR codes',
          'Password protection',
          'Basic analytics',
        ],
      },
    }),
    prisma.tier.upsert({
      where: { code: 'PRO' },
      update: {
        name: 'Pro',
        maxLinks: null,
        priceMonthly: 1300,
        priceAnnual: 12000,
        description: 'For professionals who need unlimited links and advanced features',
        features: [
          'Unlimited links',
          'Expiration controls',
          'Advanced analytics',
          'Custom domains',
          'Priority support',
        ],
      },
      create: {
        id: 'tier_pro',
        code: 'PRO',
        name: 'Pro',
        maxLinks: null,
        priceMonthly: 1300,
        priceAnnual: 12000,
        description: 'For professionals who need unlimited links and advanced features',
        features: [
          'Unlimited links',
          'Expiration controls',
          'Advanced analytics',
          'Custom domains',
          'Priority support',
        ],
      },
    }),
    prisma.tier.upsert({
      where: { code: 'DEVELOPER' },
      update: {
        name: 'Developer',
        maxLinks: null,
        priceMonthly: 2900,
        priceAnnual: 27600,
        description: 'For developers who want API-first workflow and team features',
        features: [
          'Unlimited links',
          'API key access',
          'External shorten API',
          'Bulk operations',
          'Team-ready limits',
          'Webhooks',
        ],
      },
      create: {
        id: 'tier_developer',
        code: 'DEVELOPER',
        name: 'Developer',
        maxLinks: null,
        priceMonthly: 2900,
        priceAnnual: 27600,
        description: 'For developers who want API-first workflow and team features',
        features: [
          'Unlimited links',
          'API key access',
          'External shorten API',
          'Bulk operations',
          'Team-ready limits',
          'Webhooks',
        ],
      },
    }),
  ]);

  console.log(`Seeded ${tiers.length} tiers: ${tiers.map((t) => t.code).join(', ')}`);

  const coupon = await prisma.coupon.upsert({
    where: { code: 'SAVE20' },
    update: {
      discountPercent: 20,
      maxUses: 100,
      isActive: true,
    },
    create: {
      id: 'coupon_20off',
      code: 'SAVE20',
      discountPercent: 20,
      maxUses: 100,
      usedCount: 0,
      isActive: true,
    },
  });

  console.log(`Seeded coupon: ${coupon.code} (${coupon.discountPercent}% off)`);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
