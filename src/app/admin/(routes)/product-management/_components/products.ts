import { Product } from "./types";

export const products: Product[] = [
  {
    id: 1,
    image: "🎓",
    name: "School Uniform Set",
    category: "Uniforms",
    variants: [
      { size: "Small", price: 305.0 },
      { size: "Medium", price: 325.0 },
      { size: "Large", price: 340.0 },
      { size: "X-Large", price: 360.0 },
    ],
  },
  {
    id: 2,
    image: "👕",
    name: "School P.E. Uniform Set",
    category: "Uniforms",
    variants: [
      { size: "Small", price: 270.0 },
      { size: "Medium", price: 290.0 },
      { size: "Large", price: 310.0 },
    ],
  },
  {
    id: 3,
    image: "🆔",
    name: "School ID Lace",
    category: "ID Lace",
    variants: [{ size: "Per Piece", price: 80.0 }],
  },
  {
    id: 4,
    image: "📘",
    name: "Test Booklet",
    category: "Booklet",
    variants: [{ size: "Per Piece", price: 4.0 }],
  },
  {
    id: 5,
    image: "👔",
    name: "NSTP Uniform (ROTC)",
    category: "Uniforms",
    variants: [{ size: "Small - 2XL", price: 260.0 }],
  },
  {
    id: 6,
    image: "👕",
    name: "NSTP Uniform (CWTS)",
    category: "Uniforms",
    variants: [{ size: "Small - 2XL", price: 260.0 }],
  },
];
