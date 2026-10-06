import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: false
})
export class ContactPage implements OnInit {

  private urlContact = "https://flechissons.com/requete";

  formData = {
    nom: '',
    email: '',
    sujet: '',
    message: ''
  };

  submitted = false;
  isLoading = false;
  showOverlay = false;
  isSuccess = false;
  isError = false;
  errorMessage = '';
  progress = 0;
  private progressInterval: any;

  constructor(
    private http: HttpClient,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  onSubmit() {
    this.submitted = true;

    // Vérifier si le formulaire est valide
    if (!this.formData.nom || !this.formData.email || !this.formData.sujet || !this.formData.message) {
      return;
    }

    this.isLoading = true;
    this.showOverlay = true;
    this.isSuccess = false;
    this.isError = false;
    this.progress = 0;

    // Simuler une progression
    this.startProgressAnimation();

    // Envoyer les données
    this.http.post(this.urlContact, this.formData).subscribe({
      next: (response: any) => {
        console.log('Message envoyé avec succès:', response);
        this.isLoading = false;
        this.isSuccess = true;
        this.progress = 100;
        this.stopProgressAnimation();
        this.resetForm();
      },
      error: (error) => {
        console.error('Erreur lors de l\'envoi:', error);
        this.isLoading = false;
        this.isError = true;
        this.errorMessage = error.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
        this.stopProgressAnimation();
      }
    });
  }

  startProgressAnimation() {
    this.progress = 0;
    this.progressInterval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += Math.random() * 10;
        if (this.progress > 90) {
          this.progress = 90;
        }
      }
    }, 200);
  }

  stopProgressAnimation() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  resetForm() {
    this.formData = {
      nom: '',
      email: '',
      sujet: '',
      message: ''
    };
    this.submitted = false;
  }

  closeOverlay() {
    this.showOverlay = false;
    this.isSuccess = false;
    this.isError = false;
    this.isLoading = false;
    this.progress = 0;
    this.stopProgressAnimation();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}