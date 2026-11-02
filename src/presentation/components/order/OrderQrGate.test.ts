import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import th from "../../../../messages/th.json";
import { OrderQrGate } from "./OrderQrGate";

test("OrderQrGate: Thai copy + menu / menu-book links", () => {
  const p = th.publicPages as Record<string, string>;
  assert.equal(p.orderGateTitle, "สแกน QR ที่ร้านเพื่อสั่งอาหาร");
  assert.equal(p.orderGateMenu, "ดูเมนู");
  assert.equal(p.orderGateBook, "เล่มเมนู");
  const html = renderToStaticMarkup(
    createElement(OrderQrGate, {
      slug: "nanara",
      title: p.orderGateTitle,
      description: p.orderGateDesc,
      menuLabel: p.orderGateMenu,
      bookLabel: p.orderGateBook,
    }),
  );
  assert.match(html, /data-testid="order-qr-gate"/);
  assert.match(html, /href="\/s\/nanara\/menu"/);
  assert.match(html, /href="\/s\/nanara\/menu\?view=book"/);
  assert.match(html, /สแกน QR ที่ร้านเพื่อสั่งอาหาร/);
  assert.match(html, /lucide-qr-code|lucide-qrcode/);
  // No ordering UI leaks into the gate.
  assert.doesNotMatch(html, /สั่งออนไลน์/);
});
