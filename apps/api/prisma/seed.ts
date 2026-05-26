import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  // Limit pool to avoid overwhelming the database during seeding
  log: ['error'],
});

async function main() {
  console.log('Seeding database...');

  // Sequential upserts to avoid connection pool exhaustion
  const upsertTier = async (code: string, id: string, name: string, data: Record<string, unknown>) =>
    prisma.tier.upsert({ where: { code: code as any }, update: data as any, create: { id, code: code as any, ...data } as any });

  const tiers = [];
  tiers.push(await upsertTier('FREE', 'tier_free', 'Free', {
    name: 'Free', maxLinks: 5, maxLinksPerMonth: 5, maxQrCodesPerMonth: 5,
    maxCustomDomains: 0, maxApiKeys: 0, maxWebhooks: 0, bulkCreateLimit: 0,
    analyticsRetentionDays: 30, apiRateLimitPerMinute: 0, annualDiscountPercent: 0,
    customDomains: false, apiAccess: false, webhooks: false, advancedAnalytics: false,
    utmBuilder: true, qrCustomization: false, bulkImport: false, exportData: false,
    campaignsEnabled: true, isActive: true, isPublic: true, sortOrder: 0,
    priceMonthly: 0, priceAnnual: 0,
    description: 'Get started with essential link management tools',
    features: ['5 links per month', 'Custom aliases', 'QR codes', 'Password protection', 'Basic analytics'],
  }));

  tiers.push(await upsertTier('PRO', 'tier_pro', 'Pro', {
    name: 'Pro', maxLinks: null, maxLinksPerMonth: null, maxQrCodesPerMonth: null,
    maxCustomDomains: 3, maxApiKeys: 2, maxWebhooks: 0, bulkCreateLimit: 100,
    analyticsRetentionDays: 365, apiRateLimitPerMinute: 60, annualDiscountPercent: 23,
    customDomains: true, apiAccess: true, webhooks: false, advancedAnalytics: true,
    utmBuilder: true, qrCustomization: true, bulkImport: true, exportData: true,
    campaignsEnabled: true, isActive: true, isPublic: true, sortOrder: 1,
    priceMonthly: 1300, priceAnnual: 12000,
    description: 'For professionals who need unlimited links and advanced features',
    features: ['Unlimited links', 'Expiration controls', 'Advanced analytics', 'Custom domains', 'Priority support'],
  }));

  tiers.push(await upsertTier('DEVELOPER', 'tier_developer', 'Developer', {
    name: 'Developer', maxLinks: null, maxLinksPerMonth: null, maxQrCodesPerMonth: null,
    maxCustomDomains: null, maxApiKeys: null, maxWebhooks: null, bulkCreateLimit: 1000,
    analyticsRetentionDays: null, apiRateLimitPerMinute: 600, annualDiscountPercent: 21,
    customDomains: true, apiAccess: true, webhooks: true, advancedAnalytics: true,
    utmBuilder: true, qrCustomization: true, bulkImport: true, exportData: true,
    campaignsEnabled: true, isActive: true, isPublic: true, sortOrder: 2,
    priceMonthly: 2900, priceAnnual: 27600,
    description: 'For developers who want API-first workflow and team features',
    features: ['Unlimited links', 'API key access', 'External shorten API', 'Bulk operations', 'Team-ready limits', 'Webhooks'],
  }));

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

  const adminEmail = 'admin@gmail.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const freeTier = await prisma.tier.findUnique({ where: { code: 'FREE' } });
    if (!freeTier) throw new Error('Free tier not found.');

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash: await bcrypt.hash('Admin@123456', 12),
        isAdmin: true,
        tierId: freeTier.id,
      },
    });
    console.log(`Seeded admin user: ${admin.email} (password: Admin@123456)`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
