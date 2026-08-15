import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsPublicationPage } from './details-publication.page';

describe('DetailsPublicationPage', () => {
  let component: DetailsPublicationPage;
  let fixture: ComponentFixture<DetailsPublicationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsPublicationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
