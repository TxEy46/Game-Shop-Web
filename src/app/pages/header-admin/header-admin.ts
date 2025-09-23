import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { User } from '../../model/user';
import { GameDetail } from '../../model/game';
import { CartItem } from '../../model/cart';
import { Admin } from '../admin/admin';

@Component({
  selector: 'app-header-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatToolbarModule, MatButtonModule, MatMenuModule, HttpClientModule, RouterModule],
  templateUrl: './header-admin.html',
  styleUrls: ['./header-admin.scss']
})
export class HeaderAdmin implements OnInit {
  user: User | null = null;
  query: string = '';
  results: GameDetail[] = [];
  cart: CartItem[] = [];

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  // Search
  onSearch() {
    const queryLower = this.query.trim().toLowerCase();
    if (!queryLower) {
      this.results = [];
      return;
    }

    this.http.get<GameDetail[]>('http://localhost:3000/game').subscribe({
      next: games => {
        this.results = games
          .filter(game => game.name.toLowerCase().includes(queryLower))
          .map(game => ({
            ...game,
            image_url: game.image_url ? `http://localhost:3000${game.image_url}` : '/assets/placeholder.png'
          }));
      },
      error: err => console.error(err)
    });
  }
}
