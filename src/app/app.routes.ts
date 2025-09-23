import { Routes } from '@angular/router';
import { Shop } from './pages/shop/shop';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';
import { Library } from './pages/library/library';
import { Wallet } from './pages/wallet/wallet';
import { Game } from './pages/game/game';
import { Checkout } from './pages/checkout/checkout';
import { Admin } from './pages/admin/admin';

export const routes: Routes = [
    { path: '', component: Login },
    { path: 'register', component: Register },
    { path: 'shop', component: Shop },
    { path: 'profile', component: Profile },
    { path: 'library', component: Library },
    { path: 'wallet', component: Wallet },
    { path: 'game/:id', component: Game },
    { path: 'checkout', component: Checkout },
    { path: 'admin', component: Admin },
];
