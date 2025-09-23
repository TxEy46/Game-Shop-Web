export interface CartItem {
  gameId: number;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

export const cart: CartItem[] = [];
