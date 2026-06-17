import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <main class="page">
      <header class="header">
        <h1>Tournament Konfiguration</h1>
        <nav class="nav">
          <a routerLink="/schedule">Schedule</a>
          <a routerLink="/groups">Gruppenphase</a>
          <a routerLink="/bracket">Turnierplan</a>
          <a routerLink="/live">Live Display</a>
        </nav>
      </header>

      <section class="card">
        <h2>Teams</h2>
        <form [formGroup]="teamForm" (ngSubmit)="addTeam()" class="row">
          <input type="text" placeholder="Team Name" formControlName="name" />
          <button type="submit">Hinzufügen</button>
        </form>
        @if (teams().length === 0) {
          <p class="empty">Noch keine Teams vorhanden.</p>
        } @else {
          <ul class="list">
            @for (team of teams(); track team.id) {
              <li>
                <span>{{ team.name }}</span>
                <button type="button" (click)="removeTeam(team.id)">Entfernen</button>
              </li>
            }
          </ul>
        }
      </section>

      <section class="card">
        <h2>Spielplan</h2>
        <form [formGroup]="scheduleForm" (ngSubmit)="addScheduleMatch()" class="grid">
          <label>
            Heimteam
            <select formControlName="homeTeamId">
              <option value="">Bitte wählen</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <label>
            Auswärtsteam
            <select formControlName="awayTeamId">
              <option value="">Bitte wählen</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <label>
            Startzeit
            <input type="datetime-local" formControlName="startTime" />
          </label>
          <button type="submit">Match speichern</button>
        </form>

        @if (scheduleWithNames().length === 0) {
          <p class="empty">Noch keine Matches geplant.</p>
        } @else {
          <ul class="list">
            @for (match of scheduleWithNames(); track match.id) {
              <li>
                <span>{{ match.homeTeamName }} vs {{ match.awayTeamName }} ({{ match.startTime | date: 'short' }})</span>
                <button type="button" (click)="removeScheduleMatch(match.id)">Löschen</button>
              </li>
            }
          </ul>
        }
      </section>

      <section class="card">
        <h2>Live Match & Timer</h2>
        <form [formGroup]="liveForm" (ngSubmit)="saveLiveSettings()" class="grid">
          <label>
            Aktives Heimteam
            <select formControlName="homeTeamId">
              <option value="">Kein Team</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <label>
            Aktives Auswärtsteam
            <select formControlName="awayTeamId">
              <option value="">Kein Team</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <label>
            Heim Score
            <input type="number" min="0" formControlName="homeScore" />
          </label>
          <label>
            Auswärts Score
            <input type="number" min="0" formControlName="awayScore" />
          </label>
          <label>
            Matchdauer (Minuten)
            <input type="number" min="1" formControlName="matchDurationMinutes" />
          </label>
          <button type="submit">Speichern</button>
        </form>

        <div class="timer-controls">
          <button type="button" (click)="startTimer()">Start</button>
          <button type="button" (click)="pauseTimer()">Pause</button>
          <button type="button" (click)="resetTimer()">Reset</button>
          <span>{{ formattedTimer() }}</span>
        </div>
      </section>
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
    .nav,
    .grid,
    .row,
    .timer-controls,
    .list li {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .card {
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
    }
    .grid label {
      display: grid;
      gap: 0.25rem;
      min-width: 220px;
    }
    .row input,
    .grid input,
    .grid select {
      padding: 0.4rem 0.5rem;
    }
    .list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.5rem;
    }
    .empty {
      color: #6b7280;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tournamentService = inject(TournamentService);

  readonly teams = this.tournamentService.teams;
  readonly schedule = this.tournamentService.schedule;
  readonly timer = this.tournamentService.timer;
  readonly liveMatch = this.tournamentService.liveMatch;
  readonly teamNameById = computed(() => new Map(this.teams().map((team) => [team.id, team.name])));
  readonly scheduleWithNames = computed(() =>
    this.schedule()
      .map((match) => ({
        ...match,
        homeTeamName: this.teamNameById().get(match.homeTeamId) ?? 'Unbekannt',
        awayTeamName: this.teamNameById().get(match.awayTeamId) ?? 'Unbekannt',
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );
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

  readonly teamForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
  });

  readonly scheduleForm = this.formBuilder.nonNullable.group({
    homeTeamId: ['', Validators.required],
    awayTeamId: ['', Validators.required],
    startTime: ['', Validators.required],
  });

  readonly liveForm = this.formBuilder.nonNullable.group({
    homeTeamId: [''],
    awayTeamId: [''],
    homeScore: [0, [Validators.required, Validators.min(0)]],
    awayScore: [0, [Validators.required, Validators.min(0)]],
    matchDurationMinutes: [20, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    effect(() => {
      const timer = this.timer();
      const liveMatch = this.liveMatch();
      this.liveForm.patchValue(
        {
          homeTeamId: liveMatch.homeTeamId ?? '',
          awayTeamId: liveMatch.awayTeamId ?? '',
          homeScore: liveMatch.homeScore,
          awayScore: liveMatch.awayScore,
          matchDurationMinutes: timer.matchDurationMinutes,
        },
        { emitEvent: false },
      );
    });
  }

  addTeam(): void {
    if (this.teamForm.invalid) {
      return;
    }

    this.tournamentService.addTeam(this.teamForm.controls.name.value);
    this.teamForm.reset();
  }

  removeTeam(teamId: string): void {
    this.tournamentService.removeTeam(teamId);
  }

  addScheduleMatch(): void {
    if (this.scheduleForm.invalid) {
      return;
    }

    const { homeTeamId, awayTeamId, startTime } = this.scheduleForm.getRawValue();
    if (homeTeamId === awayTeamId) {
      return;
    }

    this.tournamentService.upsertScheduleMatch({ homeTeamId, awayTeamId, startTime });
    this.scheduleForm.reset();
  }

  removeScheduleMatch(matchId: string): void {
    this.tournamentService.removeScheduleMatch(matchId);
  }

  saveLiveSettings(): void {
    if (this.liveForm.invalid) {
      return;
    }

    const values = this.liveForm.getRawValue();
    this.tournamentService.setLiveMatchTeams(values.homeTeamId || null, values.awayTeamId || null);
    this.tournamentService.updateLiveScore(values.homeScore, values.awayScore);
    this.tournamentService.setMatchDurationMinutes(values.matchDurationMinutes);
  }

  startTimer(): void {
    this.tournamentService.startTimer();
  }

  pauseTimer(): void {
    this.tournamentService.pauseTimer();
  }

  resetTimer(): void {
    this.tournamentService.resetTimer();
  }
}
