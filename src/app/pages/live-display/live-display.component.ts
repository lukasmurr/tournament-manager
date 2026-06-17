import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';

@Component({
  selector: 'app-live-display',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="screen">
      <header class="header">
        <a routerLink="/config">Zurück zur Konfiguration</a>
        <span>{{ statusText() }}</span>
      </header>

      <section class="scoreboard">
        <div class="team">
          <h2>{{ homeTeamName() }}</h2>
          <p>{{ liveMatch().homeScore }}</p>
        </div>

        <div class="timer">{{ formattedTimer() }}</div>

        <div class="team">
          <h2>{{ awayTeamName() }}</h2>
          <p>{{ liveMatch().awayScore }}</p>
        </div>
      </section>
    </main>
  `,
  styles: `
    .screen {
      min-height: 100dvh;
      display: grid;
      grid-template-rows: auto 1fr;
      background: #0f172a;
      color: #f8fafc;
      padding: 1.25rem;
      box-sizing: border-box;
      gap: 1rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1rem;
    }
    .header a {
      color: #93c5fd;
      text-decoration: none;
    }
    .scoreboard {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1.5rem;
      align-items: center;
    }
    .team {
      display: grid;
      text-align: center;
      gap: 0.75rem;
    }
    .team h2 {
      margin: 0;
      font-size: clamp(1.4rem, 3vw, 2.8rem);
      font-weight: 700;
    }
    .team p {
      margin: 0;
      font-size: clamp(3rem, 11vw, 8rem);
      font-weight: 800;
      line-height: 1;
    }
    .timer {
      font-size: clamp(2rem, 8vw, 6rem);
      font-weight: 800;
      letter-spacing: 0.08em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveDisplayComponent {
  private readonly tournamentService = inject(TournamentService);

  readonly teams = this.tournamentService.teams;
  readonly liveMatch = this.tournamentService.liveMatch;
  readonly timer = this.tournamentService.timer;
  readonly teamNameById = computed(() => new Map(this.teams().map((team) => [team.id, team.name])));
  readonly homeTeamName = computed(() => {
    const teamId = this.liveMatch().homeTeamId;
    return teamId ? this.teamNameById().get(teamId) ?? 'Heimteam' : 'Heimteam';
  });
  readonly awayTeamName = computed(() => {
    const teamId = this.liveMatch().awayTeamId;
    return teamId ? this.teamNameById().get(teamId) ?? 'Auswärtsteam' : 'Auswärtsteam';
  });
  readonly formattedTimer = computed(() => {
    const remainingSeconds = this.timer().remainingSeconds;
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(remainingSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  });
  readonly statusText = computed(() => (this.timer().isRunning ? 'Live' : 'Pausiert'));
}
