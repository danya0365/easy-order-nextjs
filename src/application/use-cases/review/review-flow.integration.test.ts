import { before, test } from "node:test";
import assert from "node:assert/strict";

import { migrateTestDb, seedShop } from "@/src/test/helpers";
import { container } from "@/src/infrastructure/di/container";
import { SubmitReviewUseCase } from "./SubmitReviewUseCase";
import { ReplyToReviewUseCase } from "./ReplyToReviewUseCase";
import { SetReviewHiddenUseCase } from "./SetReviewHiddenUseCase";

before(async () => {
  await migrateTestDb();
});

function submit() {
  return new SubmitReviewUseCase(container.shopReviewRepository);
}

async function customer(shopId: string, phone: string) {
  return container.customerRepository.findOrCreate(shopId, phone, null);
}

test("submit reviews → summary averages (hidden excluded), upsert edits", async () => {
  const { shop } = await seedShop("rev-a");
  const c1 = await customer(shop.id, "0810000001");
  const c2 = await customer(shop.id, "0810000002");

  const first = await submit().execute({ shopId: shop.id, customerId: c1.id, rating: 5, comment: "ดีมาก" });
  assert.equal(first.isNewReview, true, "first review is new → owner notified");
  await submit().execute({ shopId: shop.id, customerId: c2.id, rating: 3, comment: null });

  let summary = await container.shopReviewRepository.summary(shop.id);
  assert.equal(summary.count, 2);
  assert.equal(summary.average, 4);

  // Same customer re-submits → upsert (still 2 reviews, new average).
  const edit = await submit().execute({ shopId: shop.id, customerId: c1.id, rating: 1, comment: "เปลี่ยนใจ" });
  assert.equal(edit.isNewReview, false, "edit is not new → no owner notification");
  summary = await container.shopReviewRepository.summary(shop.id);
  assert.equal(summary.count, 2);
  assert.equal(summary.average, 2);
});

test("rating must be 1–5", async () => {
  const { shop } = await seedShop("rev-b");
  const c = await customer(shop.id, "0810000003");
  await assert.rejects(
    submit().execute({ shopId: shop.id, customerId: c.id, rating: 6, comment: null }),
    /ดาว/,
  );
});

test("admin hide removes from public summary; owner reply scoped to shop", async () => {
  const { shop } = await seedShop("rev-c");
  const c = await customer(shop.id, "0810000004");
  const { review } = await submit().execute({
    shopId: shop.id,
    customerId: c.id,
    rating: 4,
    comment: "โอเค",
  });

  // Hide → excluded from public summary + page.
  await new SetReviewHiddenUseCase(container.shopReviewRepository).execute(
    review.id,
    true,
  );
  const summary = await container.shopReviewRepository.summary(shop.id);
  assert.equal(summary.count, 0);
  const publicPage = await container.shopReviewRepository.pageByShop(shop.id);
  assert.equal(publicPage.items.length, 0);
  const ownerPage = await container.shopReviewRepository.pageByShop(shop.id, {
    includeHidden: true,
  });
  assert.equal(ownerPage.items.length, 1);

  // Owner reply on a review of another shop is rejected.
  const other = await seedShop("rev-d");
  await assert.rejects(
    new ReplyToReviewUseCase(container.shopReviewRepository).execute(
      other.shop.id,
      review.id,
      "ขอบคุณ",
    ),
    /ไม่พบรีวิว/,
  );
  // Reply within the right shop works.
  const replied = await new ReplyToReviewUseCase(
    container.shopReviewRepository,
  ).execute(shop.id, review.id, "ขอบคุณครับ");
  assert.equal(replied.ownerReply, "ขอบคุณครับ");
});
