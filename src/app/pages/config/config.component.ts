import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { GROUP_COLORS, GroupMatch, KnockoutMatch, TournamentService } from '../../services/tournament.service';

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
<!-- live form omitted here to save space as it's the same -->
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
            <div class="score-controls">
              <button type="button" class="btn-secondary score-btn" (click)="changeScore('home', -1)">-</button>
              <input type="number" min="0" formControlName="homeScore" class="score-input" />
              <button type="button" class="btn-secondary score-btn" (click)="changeScore('home', 1)">+</button>
            </div>
          </div>
          <div class="form-field-group">
            <label>Auswärts Score</label>
            <div class="score-controls">
              <button type="button" class="btn-secondary score-btn" (click)="changeScore('away', -1)">-</button>
              <input type="number" min="0" formControlName="awayScore" class="score-input" />
              <button type="button" class="btn-secondary score-btn" (click)="changeScore('away', 1)">+</button>
            </div>
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

      <!-- Gruppen Configuration -->
      <section class="section-card flex-col gap-1">
        <h2>Gruppenverwaltung</h2>
        <!-- Create Group -->
        <div class="flex-row">
          <input type="text" placeholder="Gruppenname (z.B. Gruppe A)" [(ngModel)]="newGroupName" class="flex-grow-input" />
          <div class="color-picker">
            @for (color of groupColors; track color) {
              <button
                type="button"
                class="color-swatch"
                [style.background]="color"
                [class.selected]="selectedColor === color"
                (click)="selectedColor = color"
              ></button>
            }
          </div>
          <button type="button" class="btn-primary" (click)="addGroup()" [disabled]="!newGroupName.trim()">
            Gruppe hinzufügen
          </button>
        </div>

        @if (groups().length > 0) {
          <div class="assignment-grid mt-1">
            @for (group of groups(); track group.id) {
              <div class="group-box" [style.--group-color]="group.color">
                <h3 [style.color]="group.color">{{ group.name }}</h3>
                <div class="group-teams">
                  @for (teamId of group.teamIds; track teamId) {
                    <div class="team-chip" [style.border-color]="group.color">
                      <span>{{ teamNameById().get(teamId) }}</span>
                      <button type="button" class="remove-btn" (click)="removeTeamFromGroup(group.id, teamId)">✕</button>
                    </div>
                  }
                  @if (group.teamIds.length === 0) {
                    <span class="no-teams">Noch keine Teams</span>
                  }
                </div>
                <select (change)="onAddTeamToGroup(group.id, $event)">
                  <option value="">Team hinzufügen…</option>
                  @for (team of availableTeamsForGroup(group.id); track team.id) {
                    <option [value]="team.id">{{ team.name }}</option>
                  }
                </select>
                <button type="button" class="btn-danger sm-btn mt-auto" (click)="removeGroup(group.id)">Gruppe löschen</button>
              </div>
            }
            @if (unassignedTeams().length > 0) {
              <div class="group-box unassigned">
                <h3 style="color:#8b949e">Nicht zugewiesen</h3>
                <div class="group-teams">
                  @for (team of unassignedTeams(); track team.id) {
                    <div class="team-chip unassigned-chip">{{ team.name }}</div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Group Matches Setup -->
        @for (vm of groupViewModels(); track vm.group.id) {
          <div class="matches-section-card" [style.border-color]="vm.group.color">
            <div class="matches-header" [style.background]="vm.group.color">
              <h3>Spiele: {{ vm.group.name }}</h3>
              <div class="flex-row">
                @if (vm.matches.length === 0) {
                  <button type="button" class="btn-primary sm-btn" (click)="generateGroupMatches()">Spielplan generieren</button>
                } @else {
                  <button type="button" class="btn-secondary sm-btn" (click)="regenerateGroupMatches()">Neu generieren</button>
                }
              </div>
            </div>
            <div class="matches-body">
              @if (vm.matches.length === 0) {
                <p class="empty-hint">Noch keine Spiele generiert.</p>
              } @else {
                <div class="match-list">
                  @for (match of vm.matches; track match.id) {
                    <div class="match-row" [class.played]="match.played">
                      <span class="m-team home">{{ match.homeTeamName }}</span>
                      <div class="score-pair">
                        <input type="number" min="0" class="score-input-sm"
                          [value]="match.homeScore ?? ''"
                          (change)="onGroupScoreChange(match.id, 'home', $event)" placeholder="–" />
                        <span class="colon">:</span>
                        <input type="number" min="0" class="score-input-sm"
                          [value]="match.awayScore ?? ''"
                          (change)="onGroupScoreChange(match.id, 'away', $event)" placeholder="–" />
                      </div>
                      <span class="m-team away">{{ match.awayTeamName }}</span>
                      <button type="button" class="played-btn" [class.active]="match.played" (click)="toggleGroupMatchPlayed(match)">
                        {{ match.played ? '✓ Gespielt' : 'Gespielt?' }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </section>

      <!-- Bracket Configuration -->
      <section class="section-card flex-col gap-1">
        <h2>Turnierplan</h2>
        <div class="flex-row">
          <button type="button" class="btn-primary" (click)="generateBracket()" [disabled]="groups().length < 2">
            {{ knockoutMatches().length > 0 ? '🔄 Turnierplan aktualisieren' : '🏆 Turnierplan generieren' }}
          </button>
          @if (groups().length < 2) {
            <span class="hint-text text-danger">Mindestens 2 Gruppen benötigt für K.O.-Runde.</span>
          }
        </div>

        @if (knockoutMatches().length > 0) {
          <div class="match-list mt-1">
            @for (match of knockoutVMs(); track match.id) {
              <div class="match-row" [class.played]="match.played">
                <span class="match-role-badge">{{ match.label }}</span>
                <span class="m-team home">{{ match.homeTeamName }}</span>
                @if (!match.played) {
                  <div class="score-pair">
                    <input type="number" min="0" class="score-input-sm"
                      [value]="match.homeScore ?? ''" (change)="onBracketScore(match.id, 'home', $event)" placeholder="0" />
                    <span class="colon">:</span>
                    <input type="number" min="0" class="score-input-sm"
                      [value]="match.awayScore ?? ''" (change)="onBracketScore(match.id, 'away', $event)" placeholder="0" />
                    <button type="button" class="btn-success sm-btn ml-1" (click)="confirmBracketResult(match)">Bestätigen ✓</button>
                  </div>
                } @else {
                  <div class="score-pair">
                    <span class="final-score">{{ match.homeScore }}</span>
                    <span class="colon">:</span>
                    <span class="final-score">{{ match.awayScore }}</span>
                  </div>
                }
                <span class="m-team away">{{ match.awayTeamName }}</span>
                @if (match.played) {
                  <button type="button" class="btn-secondary sm-btn" (click)="editBracketResult(match.id)">Ändern</button>
                }
              </div>
            }
          </div>
        }
      </section>

    </div>
  `,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DatePipe, MatToolbar],
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
    .score-controls {
      display: flex;
      gap: 0.5rem;
    }
    .score-btn {
      width: 40px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: bold;
    }
    .score-input {
      flex: 1;
      text-align: center;
    }
    .flex-col { display: flex; flex-direction: column; }
    .gap-1 { gap: 1rem; }
    .mt-1 { margin-top: 1rem; }
    .ml-1 { margin-left: 1rem; }
    .mt-auto { margin-top: auto; }
    .text-danger { color: #f87171; }
    
    /* Missing styles from groups & bracket config integration */
    .color-picker { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .color-swatch {
      width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: transform 0.1s, border-color 0.1s;
    }
    .color-swatch.selected { border-color: #f0f6fc; transform: scale(1.2); }
    
    .assignment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    .group-box { background: #21262d; border: 2px solid #30363d; border-radius: 10px; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .group-box.unassigned { border-style: dashed; }
    .group-teams { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 32px; }
    .team-chip { border: 1px solid transparent; font-size: 0.85rem; padding: 0.25rem 0.65rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 0.4rem; background: #161b22; }
    .unassigned-chip { border-color: #484f58; color: #c9d1d9; background: #30363d; }
    .remove-btn { background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 1rem; line-height: 1; }
    
    .matches-section-card { border: 2px solid; border-radius: 10px; background: #21262d; overflow: hidden; }
    .matches-header { padding: 0.6rem 1rem; display: flex; justify-content: space-between; align-items: center; color: #fff; }
    .matches-header h3 { margin: 0; font-size: 1.1rem; }
    .matches-body { padding: 1rem; }
    
    .match-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .match-row {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem;
      background: #161b22; border-radius: 8px; border: 1px solid #30363d; flex-wrap: wrap;
    }
    .match-row.played { background: rgba(34,197,94,0.08); border-color: #166534; }
    .match-role-badge { background: #30363d; color: #c9d1d9; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; }
    .m-team { font-weight: 700; font-size: 0.95rem; flex: 1; }
    .m-team.home { text-align: right; }
    .m-team.away { text-align: left; }
    .score-pair { display: flex; align-items: center; gap: 0.35rem; justify-content: center; }
    .score-input-sm { width: 3.5rem; text-align: center; padding: 0.35rem; font-weight: 700; border-radius: 4px; border: 2px solid #484f58; background: #0d1117; color: #f0f6fc; }
    .colon { font-weight: 800; color: #8b949e; }
    .final-score { font-size: 1.1rem; font-weight: 800; min-width: 2rem; text-align: center; }
    .played-btn {
      font-size: 0.8rem; padding: 0.3rem 0.65rem; border: 1px solid #484f58; border-radius: 20px; background: #161b22; color: #c9d1d9; cursor: pointer;
    }
    .played-btn.active { background: rgba(34,197,94,0.2); border-color: #22c55e; color: #86efac; }
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

  readonly groupColors = GROUP_COLORS;
  readonly groups = this.tournamentService.groups;
  readonly groupMatches = this.tournamentService.groupMatches;
  readonly knockoutMatches = this.tournamentService.knockoutMatches;

  newGroupName = '';
  selectedColor = GROUP_COLORS[0];

  readonly assignedTeamIds = computed(() => {
    const ids = new Set<string>();
    this.groups().forEach((g) => g.teamIds.forEach((id) => ids.add(id)));
    return ids;
  });

  readonly unassignedTeams = computed(() => this.teams().filter((t) => !this.assignedTeamIds().has(t.id)));

  readonly groupViewModels = computed(() =>
    this.groups().map((group) => {
      const matches = this.groupMatches()
        .filter((m) => m.groupId === group.id)
        .map((m) => ({
          ...m,
          homeTeamName: this.teamNameById().get(m.homeTeamId) ?? 'Unbekannt',
          awayTeamName: this.teamNameById().get(m.awayTeamId) ?? 'Unbekannt',
        }));
      return { group, matches };
    }),
  );

  readonly knockoutVMs = computed(() =>
    this.knockoutMatches().map((m) => {
      const homeName = m.homeTeamId ? (this.teamNameById().get(m.homeTeamId) ?? m.homeSlotLabel) : m.homeSlotLabel;
      const awayName = m.awayTeamId ? (this.teamNameById().get(m.awayTeamId) ?? m.awaySlotLabel) : m.awaySlotLabel;
      return { ...m, homeTeamName: homeName, awayTeamName: awayName };
    }),
  );

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

  changeScore(team: 'home' | 'away', delta: number): void {
    const control = team === 'home' ? this.liveForm.controls.homeScore : this.liveForm.controls.awayScore;
    const nextVal = Math.max(0, control.value + delta);
    control.setValue(nextVal);
    this.saveLiveSettings();
  }

  startTimer(): void { this.tournamentService.startTimer(); }
  pauseTimer(): void { this.tournamentService.pauseTimer(); }
  resetTimer(): void { this.tournamentService.resetTimer(); }

  // --- Group Config ---
  availableTeamsForGroup(groupId: string): { id: string; name: string }[] {
    const group = this.groups().find((g) => g.id === groupId);
    const inGroup = new Set(group?.teamIds ?? []);
    return this.teams().filter((t) => !inGroup.has(t.id));
  }

  addGroup(): void {
    if (!this.newGroupName.trim()) return;
    this.tournamentService.addGroup(this.newGroupName.trim(), this.selectedColor);
    this.newGroupName = '';
    const idx = this.groupColors.indexOf(this.selectedColor);
    this.selectedColor = this.groupColors[(idx + 1) % this.groupColors.length];
  }

  removeGroup(groupId: string): void { this.tournamentService.removeGroup(groupId); }

  onAddTeamToGroup(groupId: string, event: Event): void {
    const teamId = (event.target as HTMLSelectElement).value;
    if (!teamId) return;
    this.tournamentService.addTeamToGroup(groupId, teamId);
    (event.target as HTMLSelectElement).value = '';
  }

  removeTeamFromGroup(groupId: string, teamId: string): void {
    this.tournamentService.removeTeamFromGroup(groupId, teamId);
  }

  generateGroupMatches(): void { this.tournamentService.generateGroupMatches(); }
  regenerateGroupMatches(): void { this.tournamentService.regenerateGroupMatches(); }

  onGroupScoreChange(matchId: string, side: 'home' | 'away', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const score = val === '' ? null : Math.max(0, parseInt(val, 10));
    const match = this.groupMatches().find((m) => m.id === matchId);
    if (!match) return;

    if (side === 'home') {
      this.tournamentService.updateGroupMatchResult(matchId, score, match.awayScore, match.played);
    } else {
      this.tournamentService.updateGroupMatchResult(matchId, match.homeScore, score, match.played);
    }
  }

  toggleGroupMatchPlayed(match: GroupMatch): void {
    this.tournamentService.updateGroupMatchResult(match.id, match.homeScore, match.awayScore, !match.played);
  }

  // --- Bracket Config ---
  generateBracket(): void { this.tournamentService.generateKnockoutBracket(); }

  onBracketScore(matchId: string, side: 'home' | 'away', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const score = val === '' ? null : Math.max(0, parseInt(val, 10));
    const match = this.knockoutMatches().find((m) => m.id === matchId);
    if (!match) return;

    if (side === 'home') {
      this.tournamentService.updateKnockoutResult(matchId, score, match.awayScore, match.played);
    } else {
      this.tournamentService.updateKnockoutResult(matchId, match.homeScore, score, match.played);
    }
  }

  confirmBracketResult(match: KnockoutMatch): void {
    this.tournamentService.updateKnockoutResult(match.id, match.homeScore, match.awayScore, true);
  }

  editBracketResult(matchId: string): void {
    const match = this.knockoutMatches().find((m) => m.id === matchId);
    if (!match) return;
    this.tournamentService.updateKnockoutResult(matchId, match.homeScore, match.awayScore, false);
  }
}
