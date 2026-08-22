import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditprofilPage } from './editprofil.page';

describe('EditprofilPage', () => {
  let component: EditprofilPage;
  let fixture: ComponentFixture<EditprofilPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditprofilPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
