import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-required-modal',
  templateUrl: './login-required-modal.component.html',
  styleUrls: ['./login-required-modal.component.scss'],
  standalone: false
})
export class LoginRequiredModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  private sub?: Subscription;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.sub = this.authService.loginModalOpen$.subscribe(open => this.isOpen = open);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  close(): void {
    this.authService.closeLoginModal();
  }

  goToLogin(): void {
    this.authService.closeLoginModal();
    this.router.navigateByUrl('/login');
  }

  goToSignup(): void {
    this.authService.closeLoginModal();
    this.router.navigateByUrl('/signup');
  }
}
