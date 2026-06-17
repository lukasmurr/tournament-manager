import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'config',
  },
  {
    path: 'config',
    title: 'Tournament Configuration',
    loadComponent: () => import('./pages/config/config.component').then((m) => m.ConfigComponent),
  },
  {
    path: 'schedule',
    title: 'Tournament Schedule',
    loadComponent: () => import('./pages/schedule/schedule.component').then((m) => m.ScheduleComponent),
  },
  {
    path: 'groups',
    title: 'Gruppenphase',
    loadComponent: () => import('./pages/groups/groups.component').then((m) => m.GroupsComponent),
  },
  {
    path: 'bracket',
    title: 'Turnierplan',
    loadComponent: () => import('./pages/bracket/bracket.component').then((m) => m.BracketComponent),
  },
  {
    path: 'live',
    title: 'Live Display',
    loadComponent: () => import('./pages/live-display/live-display.component').then((m) => m.LiveDisplayComponent),
  },
  {
    path: '**',
    redirectTo: 'config',
  },
];
