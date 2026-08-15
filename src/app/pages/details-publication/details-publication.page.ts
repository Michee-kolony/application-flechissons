import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular';

@Component({
  selector:'app-details-publication',
  templateUrl:'details-publication.page.html',
  styleUrls:['details-publication.page.scss'],
  standalone:false
})

export class DetailsPublicationPage implements OnInit, OnDestroy {

  @ViewChild('commentInput') commentInput!: ElementRef;
  @ViewChild(IonContent) content!: IonContent;

  nouveauCommentaire='';
  youtubeUrl!: SafeResourceUrl;
  private videoElement: HTMLIFrameElement | null = null;

  publication = {
    auteur:"Église Fléchissons",
    titre:"La puissance de la foi",
    description:"Un message puissant pour fortifier votre foi et vous rapprocher davantage de Dieu.",
    date:"Il y a 2 heures",
    youtube:"https://www.youtube.com/embed/fMhxZbrACzc",
    likes:245,
    liked:false
  };

  commentaires=[
    {
      nom:"Jean Paul",
      avatar:"https://i.pravatar.cc/100?img=12",
      message:"Cette prédication m'a vraiment encouragé. Merci pour ce message.",
      date:"Il y a 10 minutes"
    },
    {
      nom:"Grâce Nzambe",
      avatar:"https://i.pravatar.cc/100?img=32",
      message:"Que Dieu bénisse cette œuvre. Très beau message.",
      date:"Il y a 30 minutes"
    }
  ];

  constructor(
    private sanitizer:DomSanitizer
  ){}

  ngOnInit(){
    const url = `${this.publication.youtube}?autoplay=1&mute=1&controls=1`;
    this.youtubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // Méthode appelée quand la page est visible
  ionViewDidEnter() {
    // Récupérer l'élément iframe
    const iframes = document.querySelectorAll('iframe');
    if (iframes.length > 0) {
      this.videoElement = iframes[0] as HTMLIFrameElement;
    }
  }

  // Méthode appelée quand on quitte la page
  ionViewWillLeave() {
    this.stopVideo();
  }

  // Méthode appelée quand le composant est détruit
  ngOnDestroy() {
    this.stopVideo();
  }

  // Arrêter la vidéo
  private stopVideo() {
    if (this.videoElement) {
      // Option 1: Recharger l'iframe avec une URL vide
      this.videoElement.src = 'about:blank';
      
      // Option 2: Alternative - retirer l'iframe du DOM
      // this.videoElement.remove();
    }
  }

  toggleLike(){
    if(this.publication.liked){
      this.publication.likes--;
      this.publication.liked=false;
    } else {
      this.publication.likes++;
      this.publication.liked=true;
    }
  }

  ajouterCommentaire(){
    const texte=this.nouveauCommentaire.trim();
    if(!texte){
      return;
    }

    this.commentaires.unshift({
      nom:"Moi",
      avatar:"https://i.pravatar.cc/100?img=5",
      message:texte,
      date:"À l'instant"
    });

    this.nouveauCommentaire='';
  }

  focusComment(){
    setTimeout(()=>{
      this.commentInput.nativeElement.focus();
    },100);
  }
}