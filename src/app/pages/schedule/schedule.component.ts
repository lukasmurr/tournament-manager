import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { TournamentService } from '../../services/tournament.service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [RouterLink, DatePipe, MatToolbar],
  template: `
    <mat-toolbar class="outdoor-toolbar">
      <span class="toolbar-title">📅 Tournament Schedule</span>
      <span class="toolbar-spacer"></span>
      <nav class="flex-row">
        <a routerLink="/config" class="nav-link">Konfiguration</a>
        <a routerLink="/groups" class="nav-link">Gruppen</a>
        <a routerLink="/bracket" class="nav-link">Turnierplan</a>
        <a routerLink="/live" class="nav-link">Live Display</a>
      </nav>
    </mat-toolbar>

    <div class="page-layout">
      @if (matches().length === 0) {
        <section class="section-card">
          <p class="empty-hint">Es sind noch keine Matches geplant.</p>
        </section>
      } @else {
        <div class="match-grid">
          @for (match of matches(); track match.id; let index = $index) {
            <article class="match-card">
              <div class="match-index">Match {{ index + 1 }}</div>
              <div class="match-teams">{{ match.homeTeamName }} vs {{ match.awayTeamName }}</div>
              <div class="match-time">
                {{ match.startTime | date: 'fullDate' }}
                <span class="time-sep">–</span>
                {{ match.startTime | date: 'shortTime' }}
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .toolbar-title {
      font-size: clamp(1rem, 2.5vw, 1.4rem);
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .toolbar-spacer { flex: 1; }
    .match-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .match-card {
      background: #161b22;
      border: 2px solid #30363d;
      border-radius: 12px;
      padding: 1.25rem;
      display: grid;
      gap: 0.5rem;
      transition: border-color 0.2s;
      &:hover { border-color: #f59e0b; }
    }
    .match-index {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #f59e0b;
    }
    .match-teams {
      font-weight: 800;
      font-size: clamp(1rem, 1.8vw, 1.25rem);
      color: #f0f6fc;
    }
    .match-time {
      color: #c9d1d9;
      font-size: 0.9rem;
    }
    .time-sep { margin: 0 0.3rem; color: #484f58; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent {
  private readonly tournamentService = inject(TournamentService);

  readonly teams = this.tournamentService.teams;
  readonly schedule = this.tournamentService.schedule;
  readonly teamNameById = computed(() => new Map(this.teams().map((team) => [team.id, team.name])));
  readonly matches = computed(() =>
    this.schedule()
      .map((match) => ({
        ...match,
        homeTeamName: this.teamNameById().get(match.homeTeamId) ?? 'Unbekannt',
        awayTeamName: this.teamNameById().get(match.awayTeamId) ?? 'Unbekannt',
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );
}
