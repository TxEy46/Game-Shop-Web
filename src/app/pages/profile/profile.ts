import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Constants } from '../../config/constants';
import { Header } from '../header/header';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  wallet_balance: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    Header
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  user: UserProfile | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private constants: Constants
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Token not found, please login again.');
      this.router.navigate(['/']);
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<UserProfile>(`${this.constants.API_ENDPOINT}/me`, { headers, withCredentials: true })
      .subscribe({
        next: res => {
          this.user = {
            ...res,
            avatar_url: res.avatar_url
              ? res.avatar_url.startsWith('http')
                ? res.avatar_url
                : `${this.constants.API_ENDPOINT}${res.avatar_url.startsWith('/') ? '' : '/'}${res.avatar_url}`
              : '/assets/profile-placeholder.png'
          };
        },
        error: err => {
          console.error('Failed to load profile:', err);
          alert('Failed to load profile.');
        }
      });
  }

  editProfile() {
    this.router.navigate(['/edit']);
  }

  getAvatarUrl(): string {
    return this.user?.avatar_url || '/assets/profile-placeholder.png';
  }
}
