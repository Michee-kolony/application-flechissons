import { Component } from '@angular/core';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false
})
export class Tab2Page {

  searchTerm = '';

  featured = {
    title: "Dieu a changé ma vie",
    image: "https://picsum.photos/800/500?random=1"
  };

  testimonies = [

    {
      title: "Guéri après plusieurs années",
      duration: "18 min",
      image: "https://picsum.photos/200?random=2"
    },

    {
      title: "Une nouvelle espérance",
      duration: "22 min",
      image: "https://picsum.photos/200?random=3"
    },

    {
      title: "Le miracle inattendu",
      duration: "14 min",
      image: "https://picsum.photos/200?random=4"
    },

    {
      title: "Ma rencontre avec Jésus",
      duration: "30 min",
      image: "https://picsum.photos/200?random=5"
    },

    {
      title: "De la peur à la paix",
      duration: "17 min",
      image: "https://picsum.photos/200?random=6"
    }

  ];

  get filteredTestimonies() {
    const query = this.searchTerm.trim().toLocaleLowerCase();

    if (!query) {
      return this.testimonies;
    }

    return this.testimonies.filter(({ title }) =>
      title.toLocaleLowerCase().includes(query)
    );
  }

}
