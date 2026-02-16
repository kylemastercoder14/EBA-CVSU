export type Variant = {
  size: string;
  price: number;
};

export type Product = {
  id: string;
  image: string;
  name: string;
  category: string;
  variants: Variant[];
};
