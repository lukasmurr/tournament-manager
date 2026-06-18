import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';

@Component({
  selector: 'app-live-display',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="screen">
      <header class="top-bar">
        <a routerLink="/config" class="back-link">← Konfiguration</a>
        <div class="status-badge" [class.running]="timer().isRunning">
          <span class="status-dot"></span>
          {{ timer().isRunning ? 'LIVE' : 'PAUSIERT' }}
        </div>
      </header>

      <main class="scoreboard">
        <div class="team-block home-block">
          <div class="team-label">Heim</div>
          <div class="team-name">{{ homeTeamName() }}</div>
          <div class="score">{{ liveMatch().homeScore }}</div>
        </div>

        <div class="center-block">
          <div class="timer">{{ formattedTimer() }}</div>
          <div class="vs-label">VS</div>
        </div>

        <div class="team-block away-block">
          <div class="team-label">Auswärts</div>
          <div class="team-name">{{ awayTeamName() }}</div>
          <div class="score">{{ liveMatch().awayScore }}</div>
        </div>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }

    .screen {
      min-height: 100dvh;
      width: 100%;
      display: grid;
      grid-template-rows: auto 1fr;
      background: #0d1117;
      color: #f0f6fc;
      box-sizing: border-box;
    }

    /* Top bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.5rem;
      background: #0d1117;
      border-bottom: 2px solid #21262d;
    }
    .back-link {
      color: #8b949e;
      font-size: clamp(0.85rem, 1.5vw, 1.1rem);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s;
    }
    .back-link:hover { color: #f59e0b; }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: clamp(0.85rem, 1.5vw, 1.1rem);
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 0.35rem 0.9rem;
      border-radius: 20px;
      background: #21262d;
      color: #8b949e;
      border: 2px solid #30363d;
    }
    .status-badge.running {
      background: rgba(239,68,68,0.15);
      color: #f87171;
      border-color: #ef4444;
    }
    .status-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #484f58;
    }
    .status-badge.running .status-dot {
      background: #ef4444;
      box-shadow: 0 0 8px #ef4444;
      animation: pulse 1s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Scoreboard */
    .scoreboard {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: clamp(1rem, 3vw, 3rem) clamp(1rem, 4vw, 4rem);
      gap: clamp(1rem, 3vw, 3rem);
    }

    .team-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: clamp(0.5rem, 1.5vw, 1.25rem);
    }

    .team-label {
      font-size: clamp(1.2rem, 2.5vw, 2.2rem);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #8b949e;
    }

    .team-name {
      font-size: clamp(1.5rem, 4vw, 3.5rem);
      font-weight: 900;
      color: #f0f6fc;
      text-align: center;
      line-height: 1.1;
      text-shadow: 0 2px 12px rgba(0,0,0,0.6);
      word-break: break-word;
    }

    .score {
      font-size: clamp(5rem, 18vw, 16rem);
      font-weight: 900;
      line-height: 1;
      color: #f59e0b;
      text-shadow: 0 4px 24px rgba(245,158,11,0.4);
      letter-spacing: -0.02em;
    }

    /* Center block */
    .center-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: clamp(0.5rem, 2vw, 2rem);
    }

    .timer {
      font-size: clamp(2rem, 8vw, 8rem);
      font-weight: 900;
      letter-spacing: 0.06em;
      color: #f0f6fc;
      text-shadow: 0 2px 16px rgba(0,0,0,0.6);
      background: #161b22;
      border: 3px solid #30363d;
      border-radius: 16px;
      padding: clamp(0.3rem, 1vw, 1rem) clamp(0.6rem, 2vw, 2rem);
      white-space: nowrap;
    }

    .vs-label {
      font-size: clamp(1rem, 2.5vw, 2.5rem);
      font-weight: 900;
      color: #30363d;
      letter-spacing: 0.2em;
    }

    /* Responsive: stack on narrow screens */
    @media (max-width: 640px) {
      .scoreboard {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
        text-align: center;
      }
      .home-block { order: 1; }
      .center-block { order: 2; }
      .away-block { order: 3; }
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
}
