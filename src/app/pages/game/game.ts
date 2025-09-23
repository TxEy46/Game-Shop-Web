import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { GameDetail } from '../../model/game';
import { Router } from '@angular/router';
import { Header } from "../header/header";

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
  inLibrary: boolean = false; // สำหรับเช็คเกมอยู่ในคลัง

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) { }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) this.userId = JSON.parse(storedUser).id;

    this.route.params.subscribe(params => {
      this.gameId = +params['id'];
      this.loadGame();
    });
  }

  loadGame() {
    this.http.get<GameDetail>(`http://localhost:3000/game/${this.gameId}`).subscribe({
      next: (data) => {
        this.game = {
          ...data,
          image_url: data.image_url ? `http://localhost:3000${data.image_url}` : '/assets/placeholder.png'
        };
        this.checkInLibrary(); // เช็คเกมในคลังหลังโหลดเกม
      },
      error: (err) => console.error('Error loading game:', err)
    });
  }

  checkInLibrary() {
    if (!this.userId) return;

    this.http.get<any[]>(`http://localhost:3000/purchase/${this.userId}`).subscribe({
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

    // ตรวจสอบว่ามีเกมนี้อยู่ในตะกร้าหรือยัง
    this.http.get<any[]>(`http://localhost:3000/cart/${this.userId}`).subscribe({
      next: (cartItems) => {
        const inCart = cartItems.some(item => item.game_id === this.game!.id);
        if (inCart) {
          alert("เกมนี้อยู่ในตะกร้าแล้ว");
          return;
        }

        // เพิ่มเกมลงตะกร้า
        this.http.post(`http://localhost:3000/cart/add`, {
          user_id: this.userId,
          game_id: this.game!.id,
          quantity: 1
        }).subscribe({
          next: () => {
            const goToShop = window.confirm(`${this.game?.name} ถูกเพิ่มลงตะกร้าแล้ว\nต้องการไปหน้า Shop หรือไม่?`);
            if (goToShop) this.router.navigate(['/shop']);
          },
          error: (err) => console.error(err)
        });
      },
      error: (err) => console.error(err)
    });
  }

  goToLibrary() {
    this.router.navigate(['/library']);
  }
}
