// Original Watches EG — Catalog Updates
// من دلوقتي التعديلات اليومية تبقى هنا فقط.
// ما تعدلش ملفات products-1.js ... products-5.js ولا index.html إلا لو بنغير نظام الموقع نفسه.
//
// availability:
// "in"  = متوفرة
// "out" = مش متوفرة
//
// مثال تعديل ساعة موجودة:
// update: {
//   "ID_الساعة": {
//     price: 2500,
//     availability: "in",
//     availabilityAsOf: "2026-09-18"
//   }
// }
//
// مثال إخفاء ساعة من المتجر:
// remove: ["ID_الساعة"]
//
// مثال إضافة ساعة جديدة:
// add: [
//   {
//     id: "custom-001",
//     brand: "Tommy Hilfiger",
//     model: "1791722",
//     name: "Tommy Hilfiger 1791722",
//     gender: "men",
//     price: 2500,
//     availability: "in",
//     availabilityAsOf: "2026-09-18",
//     images: [
//       "https://example.com/photo1.jpg",
//       "https://example.com/photo2.jpg"
//     ],
//     specs: [
//       ["البراند","Tommy Hilfiger"],
//       ["الموديل","1791722"]
//     ]
//   }
// ]

window.CATALOG_UPDATES = {
  update: {},
  remove: [],
  add: []
};
