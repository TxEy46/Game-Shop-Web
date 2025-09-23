import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  email: string = '';
  password: string = '';

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/shop']);
      }
    }
  }

  login() {
    const url = 'http://localhost:3000/user/login';
    this.http.post<{ token: string; user: any; balance?: number }>(url, {
      identifier: this.email,  // <-- ส่ง username หรือ email
      password: this.password
    }).subscribe({
      next: res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('balance', (res.balance || 0).toString());

        if (res.user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/shop']);
        }
      },
      error: err => alert(err.error?.error || 'Login failed')
    });
  }


  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('balance');
    localStorage.removeItem('token'); // ✅ ลบ token ด้วย
    this.router.navigate(['/login']);
  }
}
