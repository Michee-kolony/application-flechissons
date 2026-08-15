import { Component } from '@angular/core';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class Tab2Page {

  featured = {
    title: "Dieu a changé ma vie",
    author: "Marie Nzambe",
    image: "https://picsum.photos/800/500?random=1"
  };

  testimonies = [

    {
      title: "Guéri après plusieurs années",
      author: "Jean Mukendi",
      duration: "18 min",
      image: "https://picsum.photos/200?random=2"
    },

    {
      title: "Une nouvelle espérance",
      author: "Grâce Ilunga",
      duration: "22 min",
      image: "https://picsum.photos/200?random=3"
    },

    {
      title: "Le miracle inattendu",
      author: "Samuel Kanku",
      duration: "14 min",
      image: "https://picsum.photos/200?random=4"
    },

    {
      title: "Ma rencontre avec Jésus",
      author: "Rachel Nzambe",
      duration: "30 min",
      image: "https://picsum.photos/200?random=5"
    },

    {
      title: "De la peur à la paix",
      author: "David Kalala",
      duration: "17 min",
      image: "https://picsum.photos/200?random=6"
    }

  ];

}