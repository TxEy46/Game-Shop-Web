export interface GameDetail {
  id: number;
  name: string;
  price: number;
  category_id: number;
  image_url?: string;
  description?: string;
  release_date?: string;
  category_name?: string;
  sales_count?: number;
  total_sales?: number;
}