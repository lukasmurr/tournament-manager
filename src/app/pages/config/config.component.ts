import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { TournamentService } from '../../services/tournament.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MatToolbar],
  template: `
    <mat-toolbar class="outdoor-toolbar">
      <span class="toolbar-title">🏆 Tournament Manager</span>
      <span class="toolbar-spacer"></span>
      <nav class="flex-row">
        <a routerLink="/schedule" class="nav-link">Schedule</a>
        <a routerLink="/groups" class="nav-link">Gruppen</a>
        <a routerLink="/bracket" class="nav-link">Turnierplan</a>
        <a routerLink="/live" class="nav-link">Live Display</a>
      </nav>
    </mat-toolbar>

    <div class="page-layout">

      <section class="section-card">
        <h2>Teams</h2>
        <form [formGroup]="teamForm" (ngSubmit)="addTeam()" class="flex-row">
          <input type="text" placeholder="Team Name" formControlName="name" class="flex-grow-input" />
          <button type="submit" class="btn-primary">Hinzufügen</button>
        </form>
        @if (teams().length === 0) {
          <p class="empty-hint">Noch keine Teams vorhanden.</p>
        } @else {
          <ul class="item-list">
            @for (team of teams(); track team.id) {
              <li>
                <span>{{ team.name }}</span>
                <button type="button" class="btn-danger" (click)="removeTeam(team.id)">Entfernen</button>
              </li>
            }
          </ul>
        }
      </section>

      <section class="section-card">
        <h2>Spielplan</h2>
        <form [formGroup]="scheduleForm" (ngSubmit)="addScheduleMatch()" class="form-grid">
          <div class="form-field-group">
            <label>Heimteam</label>
            <select formControlName="homeTeamId">
              <option value="">Bitte wählen</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </div>
          <div class="form-field-group">
            <label>Auswärtsteam</label>
            <select formControlName="awayTeamId">
              <option value="">Bitte wählen</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </div>
          <div class="form-field-group">
            <label>Startzeit</label>
            <input type="datetime-local" formControlName="startTime" />
          </div>
          <div class="form-field-group align-end">
            <button type="submit" class="btn-primary full-btn">Match speichern</button>
          </div>
        </form>
        @if (scheduleWithNames().length === 0) {
          <p class="empty-hint">Noch keine Matches geplant.</p>
        } @else {
          <ul class="item-list">
            @for (match of scheduleWithNames(); track match.id) {
              <li>
                <span>{{ match.homeTeamName }} vs {{ match.awayTeamName }}
                  <small class="match-time">({{ match.startTime | date: 'short' }})</small>
                </span>
                <button type="button" class="btn-danger" (click)="removeScheduleMatch(match.id)">Löschen</button>
              </li>
            }
          </ul>
        }
      </section>

      <section class="section-card">
        <h2>Live Match &amp; Timer</h2>
        <form [formGroup]="liveForm" (ngSubmit)="saveLiveSettings()" class="form-grid">
          <div class="form-field-group">
            <label>Aktives Heimteam</label>
            <select formControlName="homeTeamId">
              <option value="">Kein Team</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </div>
          <div class="form-field-group">
            <label>Aktives Auswärtsteam</label>
            <select formControlName="awayTeamId">
              <option value="">Kein Team</option>
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          </div>
          <div class="form-field-group">
            <label>Heim Score</label>
            <input type="number" min="0" formControlName="homeScore" />
          </div>
          <div class="form-field-group">
            <label>Auswärts Score</label>
            <input type="number" min="0" formControlName="awayScore" />
          </div>
          <div class="form-field-group">
            <label>Matchdauer (Minuten)</label>
            <input type="number" min="1" formControlName="matchDurationMinutes" />
          </div>
          <div class="form-field-group align-end">
            <button type="submit" class="btn-primary full-btn">Speichern</button>
          </div>
        </form>

        <div class="timer-row">
          <button type="button" class="btn-success timer-btn" (click)="startTimer()">▶ Start</button>
          <button type="button" class="btn-secondary timer-btn" (click)="pauseTimer()">⏸ Pause</button>
          <button type="button" class="btn-danger timer-btn" (click)="resetTimer()">↺ Reset</button>
          <span class="timer-display">{{ formattedTimer() }}</span>
        </div>
      </section>

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
    .flex-grow-input { flex: 1; min-width: 160px; }
    .align-end { justify-self: stretch; display: flex; align-items: flex-end; }
    .full-btn { width: 100%; }
    .match-time { color: #8b949e; font-size: 0.85em; margin-left: 0.4rem; }
    .timer-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 1rem 1.25rem;
    }
    .timer-btn { min-width: 100px; }
    .timer-display {
      font-size: clamp(1.8rem, 4vw, 3rem);
      font-weight: 800;
      color: #f59e0b;
      letter-spacing: 0.1em;
      margin-left: auto;
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
    if (this.teamForm.invalid) return;
    this.tournamentService.addTeam(this.teamForm.controls.name.value);
    this.teamForm.reset();
  }

  removeTeam(teamId: string): void {
    this.tournamentService.removeTeam(teamId);
  }

  addScheduleMatch(): void {
    if (this.scheduleForm.invalid) return;
    const { homeTeamId, awayTeamId, startTime } = this.scheduleForm.getRawValue();
    if (homeTeamId === awayTeamId) return;
    this.tournamentService.upsertScheduleMatch({ homeTeamId, awayTeamId, startTime });
    this.scheduleForm.reset();
  }

  removeScheduleMatch(matchId: string): void {
    this.tournamentService.removeScheduleMatch(matchId);
  }

  saveLiveSettings(): void {
    if (this.liveForm.invalid) return;
    const values = this.liveForm.getRawValue();
    this.tournamentService.setLiveMatchTeams(values.homeTeamId || null, values.awayTeamId || null);
    this.tournamentService.updateLiveScore(values.homeScore, values.awayScore);
    this.tournamentService.setMatchDurationMinutes(values.matchDurationMinutes);
  }

  startTimer(): void { this.tournamentService.startTimer(); }
  pauseTimer(): void { this.tournamentService.pauseTimer(); }
  resetTimer(): void { this.tournamentService.resetTimer(); }
}
