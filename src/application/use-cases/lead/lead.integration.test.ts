import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { CreateLeadUseCase } from "@/src/application/use-cases/lead/CreateLeadUseCase";
import { AddLeadVisitLogUseCase } from "@/src/application/use-cases/lead/AddLeadVisitLogUseCase";
import { SetLeadStatusUseCase } from "@/src/application/use-cases/lead/SetLeadStatusUseCase";
import { ConvertLeadToShopUseCase } from "@/src/application/use-cases/lead/ConvertLeadToShopUseCase";

before(async () => {
  await migrateTestDb();
});

const leads = () => container.leadRepository;
const visitLogs = () => container.leadVisitLogRepository;

test("lead lifecycle: create → visit → won → convert to shop", async () => {
  // An existing user to act as the admin operator (FK target for created/performedBy).
  const { ownerId: actor } = await seedShop("leadactor");

  const lead = await new CreateLeadUseCase(
    leads(),
    container.shopCategoryRepository,
  ).execute({
    name: "ลีดทดสอบ คาเฟ่",
    address: "ทองหล่อ กรุงเทพฯ",
    phone: "021234567",
    latitude: 13.73,
    longitude: 100.57,
    createdBy: actor,
  });
  assert.equal(lead.status, "new");

  // A field visit advances the funnel to "interested".
  await new AddLeadVisitLogUseCase(leads(), visitLogs()).execute({
    leadId: lead.id,
    reaction: "positive",
    advanceTo: "interested",
    note: "เจ้าของสนใจ",
    performedBy: actor,
  });
  assert.equal((await leads().findById(lead.id))?.status, "interested");

  // It plots on the lead map while still a prospect.
  assert.equal((await leads().listMapLocations()).length, 1);

  // Mark won, then convert to a real billable shop.
  await new SetLeadStatusUseCase(leads()).execute(lead.id, "won");
  const slug = "converted-leadtest";
  const { shop, branch } = await new ConvertLeadToShopUseCase(
    leads(),
    visitLogs(),
    container.shopRepository,
    container.userRepository,
    container.subscriptionRepository,
    container.passwordHasher,
    container.branchRepository,
  ).execute({
    leadId: lead.id,
    slug,
    ownerEmail: `owner@${slug}.test`,
    ownerPassword: "password123",
    performedBy: actor,
  });

  // The new shop exists and its first branch carries the lead's coordinates
  // (re-read from the DB — convert returns the pre-location-update branch).
  assert.ok(await container.shopRepository.findBySlug(slug), "shop created");
  const savedBranch = await container.branchRepository.findById(branch.id);
  assert.equal(savedBranch?.latitude, 13.73);
  assert.equal(savedBranch?.longitude, 100.57);

  // The lead is linked to the shop and a "converted" visit log was recorded.
  const reloaded = await leads().findById(lead.id);
  assert.equal(reloaded?.convertedShopId, shop.id);
  assert.ok((await visitLogs().listByLead(lead.id)).length >= 2);

  // A converted lead drops off the prospect map.
  assert.equal((await leads().listMapLocations()).length, 0);
});

test("cannot convert a lead that is not won", async () => {
  const { ownerId: actor } = await seedShop("leadactor2");
  const lead = await new CreateLeadUseCase(
    leads(),
    container.shopCategoryRepository,
  ).execute({ name: "ยังไม่ปิดการขาย", createdBy: actor });

  await assert.rejects(
    new ConvertLeadToShopUseCase(
      leads(),
      visitLogs(),
      container.shopRepository,
      container.userRepository,
      container.subscriptionRepository,
      container.passwordHasher,
      container.branchRepository,
    ).execute({
      leadId: lead.id,
      slug: "should-not-exist",
      ownerEmail: "x@x.test",
      ownerPassword: "password123",
      performedBy: actor,
    }),
  );
});
