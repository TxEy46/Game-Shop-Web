// login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Constants } from '../../config/constants'; // import Constants

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

  constructor(private http: HttpClient, private router: Router, private constants: Constants) {}

  ngOnInit() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'admin') this.router.navigate(['/admin']);
      else this.router.navigate(['/shop']);
    }
  }

  login() {
    const url = `${this.constants.API_ENDPOINT}/login`; // ใช้ Constants
    this.http.post<any>(url, { identifier: this.email, password: this.password }, { withCredentials: true })
      .subscribe({
        next: res => {
          localStorage.setItem('user', JSON.stringify({ role: res.role }));
          localStorage.setItem('token', res.token);

          if (res.role === 'admin') this.router.navigate(['/admin']);
          else this.router.navigate(['/shop']);
        },
        error: err => {
          console.error(err);
          const message = err.error?.message || 'Login failed';
          alert(message);
        }
      });
  }

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
