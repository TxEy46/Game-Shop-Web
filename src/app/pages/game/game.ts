import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Header } from "../header/header";
import { GameDetail } from '../../model/game';
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatCardModule, MatButtonModule, Header],
  templateUrl: './game.html',
  styleUrls: ['./game.scss']
})
export class Game implements OnInit {
  game: GameDetail | null = null;
  private gameId: number = 0;
  private userId: number | null = null;
  inLibrary: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private constants: Constants
  ) {}

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) this.userId = JSON.parse(storedUser).id;

    this.route.params.subscribe(params => {
      this.gameId = +params['id'];
      this.loadGame();
    });
  }

  private resolveImageURL(url?: string | null): string {
    if (!url) return '/assets/placeholder.png';
    return url.startsWith('http') ? url : `${this.constants.API_ENDPOINT}${url}`;
  }

  loadGame() {
    const url = `${this.constants.API_ENDPOINT}/game/${this.gameId}`;
    this.http.get<GameDetail>(url).subscribe({
      next: (data) => {
        this.game = {
          ...data,
          image_url: this.resolveImageURL(data.image_url)
        };
        this.checkInLibrary();
      },
      error: (err) => console.error('Error loading game:', err)
    });
  }

  checkInLibrary() {
    if (!this.userId) return;
    const url = `${this.constants.API_ENDPOINT}/purchase/${this.userId}`;

    this.http.get<any[]>(url).subscribe({
      next: (games) => {
        this.inLibrary = games.some(g => g.id === this.gameId);
      },
      error: (err) => console.error('Error checking library:', err)
    });
  }

  addToCart() {
    if (!this.userId) return alert("ต้อง login ก่อน");
    if (!this.game) return;

    if (this.inLibrary) {
      alert("คุณมีเกมนี้อยู่แล้วในคลัง");
      return;
    }

    const cartUrl = `${this.constants.API_ENDPOINT}/cart/${this.userId}`;
    const addUrl = `${this.constants.API_ENDPOINT}/cart/add`;

    this.http.get<any[]>(cartUrl).subscribe({
      next: (cartItems) => {
        const inCart = cartItems.some(item => item.game_id === this.game!.id);
        if (inCart) {
          alert("เกมนี้อยู่ในตะกร้าแล้ว");
          return;
        }

        this.http.post(addUrl, {
          user_id: this.userId,
          game_id: this.game!.id,
          quantity: 1
        }).subscribe({
          next: () => {
            const goToShop = window.confirm(`${this.game?.name} ถูกเพิ่มลงตะกร้าแล้ว\nต้องการไปหน้า Shop หรือไม่?`);
            if (goToShop) this.router.navigate(['/shop']);
          },
          error: (err) => console.error('Error adding to cart:', err)
        });
      },
      error: (err) => console.error('Error fetching cart:', err)
    });
  }

  goToLibrary() {
    this.router.navigate(['/library']);
  }
}
