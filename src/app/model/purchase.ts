export interface Purchase {
  id: number;
  user_id: number;
  game_ids: number[];
  total_amount: number;
  discount_code?: string;
  final_amount: number;
  purchased_at?: string;
}