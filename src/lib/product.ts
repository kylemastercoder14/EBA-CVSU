// lib/kiosk/products.ts
// Single source of truth for all kiosk products.
// Import Product type and PRODUCTS array wherever needed.

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string; // path relative to /public, e.g. "/products/rotc.png"
  description?: string; // optional longer description
  visitorAccess: boolean; // false = student-only product
  available: boolean; // false = out of stock
  preOrder?: boolean; // true = can still be pre-ordered
  sizes?: string[]; // omit if product has no size variants
};

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "School Uniform Set",
    category: "Uniforms",
    price: 450,
    image: "/uploads/products/product-1771252236790-523394620.png",
    description:
      "Complete school uniform set including polo shirt and slacks/skirt. Standard CvSU-Rosario uniform.",
    visitorAccess: false,
    available: true,
    sizes: ["Small", "Medium", "Large", "X-Large", "XX-Large"],
  },
  {
    id: "p2",
    name: "School P.E Uniform Set",
    category: "Uniforms",
    price: 450,
    image: "/uploads/products/product-1771252340322-940575155.png",
    description:
      "Official Physical Education uniform set for CvSU-Rosario students.",
    visitorAccess: false,
    available: false,
    preOrder: true,
    sizes: ["Small", "Medium", "Large", "X-Large"],
  },
  {
    id: "p5",
    name: "School ID Lace",
    category: "IDs",
    price: 450,
    image: "/uploads/products/product-1771254955142-904520470.png",
    description: "Official CvSU-Rosario ID lace with school colors and logo.",
    visitorAccess: true,
    available: true,
  },
  {
    id: "p3",
    name: "Test Booklet",
    category: "Booklet",
    price: 4,
    image: "/products/booklet.png",
    description:
      "Standard examination booklet used for written tests and quizzes.",
    visitorAccess: true,
    available: false,
    preOrder: true,
  },
  {
    id: "p4",
    name: "NSTP Uniform (ROTC)",
    category: "Uniforms",
    price: 400,
    image: "/products/rotc.png",
    description:
      "Complete NSTP ROTC uniform set with shirt and fatigue pants. Designed for comfort, durability, and ease of movement during drills, formations, and training activities.",
    visitorAccess: false,
    available: true,
    sizes: ["Small", "Medium", "Large", "X-Large", "XX-Large"],
  },
  {
    id: "p6",
    name: "NSTP Uniform (CWTS)",
    category: "Uniforms",
    price: 390,
    image: "/uploads/products/product-1771255042386-804932604.png",
    description:
      "Official Civic Welfare Training Service uniform for NSTP CWTS students.",
    visitorAccess: false,
    available: true,
    sizes: ["Small", "Medium", "Large", "X-Large"],
  },
];
