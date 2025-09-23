import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Header } from '../header/header';
import { User } from '../../model/user';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, FormsModule, HttpClientModule, Header],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  user: User | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) this.user = JSON.parse(storedUser);
    this.loadBalance();
  }

  loadBalance() {
    if (!this.user) return;
    this.http.get<{ wallet_balance: number }>(`http://localhost:3000/wallet/${this.user.id}`)
      .subscribe({
        next: res => {
          if (this.user) this.user.userBalance = res.wallet_balance;
        },
        error: err => console.error(err)
      });
  }

  editProfile() {
    alert('Functionality to edit profile goes here.');
  }
}
