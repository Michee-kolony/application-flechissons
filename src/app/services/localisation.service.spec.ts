import { TestBed } from '@angular/core/testing';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { LocalisationService } from './localisation.service';

describe('LocalisationService', () => {
  let service: LocalisationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActionSheetController, useValue: {} },
        { provide: ToastController, useValue: {} }
      ]
    });
    service = TestBed.inject(LocalisationService);
  });

  it('privilégie les coordonnées quand elles sont disponibles', () => {
    const destination = service.destination({
      adresse: '1 rue de la Paix',
      latitude: 5.3364,
      longitude: -4.0267
    });

    expect(destination).toBe('5.3364,-4.0267');
    expect(service.urlAppleMaps(destination!))
      .toBe('https://maps.apple.com/?daddr=5.3364,-4.0267&dirflg=d');
    expect(service.urlGoogleMaps(destination!))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=5.3364,-4.0267');
  });

  it("utilise l'adresse encodée si les coordonnées sont absentes ou invalides", () => {
    const adresse = 'Église & Co, rue #3 ?a=1';
    const attendu = encodeURIComponent(adresse);

    expect(service.destination({ adresse, latitude: null, longitude: null })).toBe(attendu);
    expect(service.destination({ adresse, latitude: 91, longitude: 0 })).toBe(attendu);
    expect(service.destination({ adresse, latitude: NaN, longitude: 2 })).toBe(attendu);
    expect(attendu).not.toMatch(/[&#?]/);
  });

  it("ne renvoie rien sans coordonnées ni adresse", () => {
    expect(service.destination({ adresse: '   ' })).toBeNull();
  });
});
