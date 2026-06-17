import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <main class="page">
      <header class="header">
        <h1>Tournament Schedule</h1>
        <nav class="nav">
          <a routerLink="/config">Config</a>
          <a routerLink="/groups">Gruppenphase</a>
          <a routerLink="/bracket">Turnierplan</a>
          <a routerLink="/live">Live Display</a>
        </nav>
      </header>

      @if (matches().length === 0) {
        <section class="empty">
          <p>Es sind noch keine Matches geplant.</p>
        </section>
      } @else {
        <section class="bracket">
          @for (match of matches(); track match.id; let index = $index) {
            <article class="match-card">
              <p class="match-title">Match {{ index + 1 }}</p>
              <p class="teams">{{ match.homeTeamName }} vs {{ match.awayTeamName }}</p>
              <p class="time">{{ match.startTime | date: 'fullDate' }} – {{ match.startTime | date: 'shortTime' }}</p>
            </article>
          }
        </section>
      }
    </main>
  `,
  styles: `
    .page {
      max-width: 960px;
      margin: 0 auto;
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }
    .header,
    .nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .bracket {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.75rem;
    }
    .match-card {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 0.9rem;
      display: grid;
      gap: 0.35rem;
    }
    .match-title {
      margin: 0;
      color: #4b5563;
      font-size: 0.875rem;
    }
    .teams {
      margin: 0;
      font-weight: 700;
    }
    .time {
      margin: 0;
      color: #111827;
    }
    .empty {
      color: #6b7280;
    }
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
