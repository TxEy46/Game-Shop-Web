import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router } from '@angular/router';
import { GameDetail } from '../../model/game';
import { Header } from "../header/header";

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatCardModule, MatButtonModule, RouterModule, Header],
  templateUrl: './library.html',
  styleUrls: ['./library.scss']
})
export class Library implements OnInit {
  purchasedGames: GameDetail[] = [];
  private userId: number = 0;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) this.userId = JSON.parse(storedUser).id;

    this.loadPurchasedGames();
  }

  loadPurchasedGames() {
    this.http.get<GameDetail[]>(`http://localhost:3000/purchase/${this.userId}`)
      .subscribe({
        next: res => {
          this.purchasedGames = res.map(game => ({
            ...game,
            image_url: game.image_url ? `http://localhost:3000${game.image_url}` : '/assets/placeholder.png'
          }));
        },
        error: err => console.error('Error loading purchased games:', err)
      });
  }

  playGame(gameId: number) {
    // ค้นหาเกมจาก purchasedGames ตาม id
    const game = this.purchasedGames.find(g => g.id === gameId);
    if (game) {
      alert(`กำลังเล่น: ${game.name}`);
    }
  }

  goToGamePage(gameId: number) {
  // สมมติ URL ของหน้าเกมคือ /game/:id
  this.router.navigate(['/game', gameId]);
}
}
