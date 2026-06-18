import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { TournamentService, GROUP_COLORS, GroupMatch, KnockoutMatch } from '../../services/tournament.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, MatToolbar],
  template: `
    <mat-toolbar class="outdoor-toolbar">
      <span class="toolbar-title">🏆 Tournament Manager - Konfiguration</span>
      <span class="toolbar-spacer"></span>
      <nav class="flex-row">
        <a routerLink="/groups" class="nav-link">Gruppen</a>
        <a routerLink="/bracket" class="nav-link">Turnierplan</a>
        <a routerLink="/live" class="nav-link">Live Display</a>
      </nav>
    </mat-toolbar>

    <div class="page-layout">
      <!-- 1. Gruppen anlegen -->
      <section class="section-card flex-col gap-1">
        <h2>1. Gruppen anlegen</h2>
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
                <button type="button" class="btn-danger sm-btn mt-auto" (click)="removeGroup(group.id)">Gruppe löschen</button>
              </div>
            }
          </div>
        }
      </section>

      <!-- 2. Teams anlegen & sofort zuweisen -->
      <section class="section-card">
        <h2>2. Teams anlegen & in Gruppe zuweisen</h2>
        <form [formGroup]="teamForm" (ngSubmit)="addTeam()" class="flex-row">
          <input type="text" placeholder="Team Name" formControlName="name" class="flex-grow-input" />
          <select formControlName="groupId" class="flex-grow-input">
            <option value="">(Gruppe auswählen)</option>
            @for (group of groups(); track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
          <button type="submit" class="btn-primary" [disabled]="teamForm.invalid || groups().length === 0">Hinzufügen</button>
        </form>

        <div class="assignment-grid mt-1">
          @for (group of groups(); track group.id) {
            <div class="group-box" [style.--group-color]="group.color">
              <h3 [style.color]="group.color">{{ group.name }} Teams</h3>
              <div class="group-teams">
                @for (teamId of group.teamIds; track teamId) {
                  <div class="team-chip" [style.border-color]="group.color">
                    <span>{{ teamNameById().get(teamId) }}</span>
                    <button type="button" class="remove-btn" (click)="removeTeamAndFromGroup(group.id, teamId)">✕</button>
                  </div>
                }
                @if (group.teamIds.length === 0) {
                  <span class="no-teams">Noch keine Teams</span>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- 3. Live Match & Timer -->
      <section class="section-card" id="live-section">
        <h2>3. Aktuelles Match &amp; Timer (Live Ansicht)</h2>
        <div class="timer-row">
          @if (liveMatch().matchId) {
            <div class="live-match-display flex-grow-input" style="display:flex; justify-content: space-between; align-items: center; position: relative;">
              <span class="m-team home" style="flex: 1; text-align: right; margin-right: 1rem;">{{ liveHomeName() }}</span>
              <div class="score-controls" style="flex: 0 0 auto;">
                <button type="button" class="btn-secondary score-btn" (click)="changeScore('home', -1)">-</button>
                <div class="score-input" style="font-size: 2rem; min-width: 40px; text-align:center;">{{ liveMatch().homeScore }}</div>
                <button type="button" class="btn-secondary score-btn" (click)="changeScore('home', 1)">+</button>
              </div>
              <span class="colon" style="margin: 0 0.5rem; font-size:2rem;">:</span>
              <div class="score-controls" style="flex: 0 0 auto;">
                <button type="button" class="btn-secondary score-btn" (click)="changeScore('away', -1)">-</button>
                <div class="score-input" style="font-size: 2rem; min-width: 40px; text-align:center;">{{ liveMatch().awayScore }}</div>
                <button type="button" class="btn-secondary score-btn" (click)="changeScore('away', 1)">+</button>
              </div>
              <span class="m-team away" style="flex: 1; text-align: left; margin-left: 1rem;">{{ liveAwayName() }}</span>
            </div>
          } @else {
            <div class="empty-hint flex-grow-input" style="text-align:center; flex: 1;">Kein aktives Match ausgewählt. Klicke unten auf "Spielen".</div>
          }
        </div>

        <form [formGroup]="liveForm" (ngSubmit)="saveLiveSettings()" class="form-grid mt-1">
          <div class="form-field-group">
            <label>Matchdauer (Minuten)</label>
            <input type="number" min="1" formControlName="matchDurationMinutes" />
          </div>
          <div class="form-field-group align-end">
            <button type="submit" class="btn-primary full-btn">Dauer Speichern</button>
          </div>
        </form>

        <div class="timer-row mt-1">
          <button type="button" class="btn-success timer-btn" (click)="startTimer()" [disabled]="!liveMatch().matchId">▶ Start</button>
          <button type="button" class="btn-secondary timer-btn" (click)="pauseTimer()" [disabled]="!liveMatch().matchId">⏸ Pause</button>
          <button type="button" class="btn-danger timer-btn" (click)="resetTimer()" [disabled]="!liveMatch().matchId">↺ Reset</button>
          <button type="button" class="btn-primary" (click)="finishMatchManually()" [disabled]="!liveMatch().matchId">Ende & Speichern</button>
          <span class="timer-display">{{ formattedTimer() }}</span>
        </div>
      </section>

      <!-- 4. Gruppen Matches spielen -->
      <section class="section-card matches-section-card">
        <div class="matches-header">
          <h3>4. Gruppenspiele durchführen</h3>
          <div>
            <button type="button" class="btn-secondary sm-btn" (click)="generateGroupMatches()">Spiele Generieren/Aktualisieren</button>
          </div>
        </div>
        <div class="matches-body">
          @if (groupViewModels().length === 0) {
            <p class="empty-hint">Noch keine Spiele generiert.</p>
          }

          @for (gvm of groupViewModels(); track gvm.group.id) {
            @if (gvm.matches.length > 0) {
              <h4 [style.color]="gvm.group.color" class="mt-1">{{ gvm.group.name }}</h4>
              <div class="match-list">
                @for (match of gvm.matches; track match.id) {
                  <div class="match-row" [class.played]="match.played" [class.active-live]="liveMatch().matchId === match.id">
                    <span class="m-team home">{{ match.homeTeamName }}</span>
                    
                    <div class="score-pair">
                      @if (match.played) {
                        <span class="final-score">{{ match.homeScore }}</span>
                        <span class="colon">:</span>
                        <span class="final-score">{{ match.awayScore }}</span>
                      } @else {
                        <span class="final-score">-</span>
                        <span class="colon">:</span>
                        <span class="final-score">-</span>
                      }
                    </div>

                    <span class="m-team away">{{ match.awayTeamName }}</span>
                    
                    <button type="button" class="btn-primary sm-btn" (click)="playMatch(match.id, 'group')" [disabled]="match.played">
                      {{ match.played ? 'Gespielt' : '▶ Spielen' }}
                    </button>
                  </div>
                }
              </div>
            }
          }
        </div>
      </section>

      <!-- 5. Knockout Stage / Finalspiele -->
      <section class="section-card matches-section-card">
        <div class="matches-header" style="background:#581c87; border-bottom:1px solid #7e22ce;">
          <h3>5. Finalrunde</h3>
          <button type="button" class="btn-primary sm-btn" (click)="generateBracket()">Turnierbaum generieren</button>
        </div>
        <div class="matches-body">
          @if (knockoutVMs().length > 0) {
            <div class="match-list mt-1">
              @for (match of knockoutVMs(); track match.id) {
                <div class="match-row" [class.played]="match.played" [class.active-live]="liveMatch().matchId === match.id">
                  <span class="match-role-badge">{{ match.label }}</span>
                  <span class="m-team home">{{ match.homeTeamName }}</span>
                  
                  <div class="score-pair">
                    @if (match.played) {
                      <span class="final-score">{{ match.homeScore }}</span>
                      <span class="colon">:</span>
                      <span class="final-score">{{ match.awayScore }}</span>
                    } @else {
                      <span class="final-score">-</span>
                      <span class="colon">:</span>
                      <span class="final-score">-</span>
                    }
                  </div>

                  <span class="m-team away">{{ match.awayTeamName }}</span>
                  
                  <button type="button" class="btn-primary sm-btn" (click)="playMatch(match.id, 'knockout')" [disabled]="match.played || !match.homeTeamId || !match.awayTeamId">
                    {{ match.played ? 'Gespielt' : '▶ Spielen' }}
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="empty-hint">Kein Turnierbaum generiert (benötigt beendete Gruppenphase).</p>
          }
        </div>
      </section>

    </div>
  `,
  styles: `
    :host { display: block; }
    .toolbar-title { font-size: clamp(1rem, 2.5vw, 1.4rem); font-weight: 800; color: #f59e0b; letter-spacing: 0.04em; white-space: nowrap; }
    .toolbar-spacer { flex: 1; }
    .flex-grow-input { flex: 1; min-width: 160px; }
    .align-end { justify-self: stretch; display: flex; align-items: flex-end; }
    .full-btn { width: 100%; }
    .timer-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; background: #21262d; border: 1px solid #30363d; border-radius: 10px; padding: 1rem 1.25rem; }
    .timer-btn { min-width: 100px; }
    .timer-display { font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 800; color: #f59e0b; letter-spacing: 0.1em; margin-left: auto; }
    .score-controls { display: flex; gap: 0.5rem; }
    .score-btn { width: 40px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: bold; }
    .flex-col { display: flex; flex-direction: column; }
    .gap-1 { gap: 1rem; }
    .mt-1 { margin-top: 1rem; }
    .mt-auto { margin-top: auto; }
    .color-picker { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: transform 0.1s, border-color 0.1s; }
    .color-swatch.selected { border-color: #f0f6fc; transform: scale(1.2); }
    .assignment-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    .group-box { background: #21262d; border: 2px solid #30363d; border-radius: 10px; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .group-teams { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 32px; }
    .team-chip { border: 1px solid transparent; font-size: 0.85rem; padding: 0.25rem 0.65rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 0.4rem; background: #161b22; }
    .remove-btn { background: none; border: none; color: #f87171; cursor: pointer; padding: 0; font-size: 1rem; line-height: 1; }
    .matches-section-card { border: 2px solid; border-radius: 10px; background: #21262d; overflow: hidden; }
    .matches-header { padding: 0.6rem 1rem; display: flex; justify-content: space-between; align-items: center; color: #fff; }
    .matches-header h3 { margin: 0; font-size: 1.1rem; }
    .matches-body { padding: 1rem; }
    .match-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .match-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; background: #161b22; border-radius: 8px; border: 1px solid #30363d; flex-wrap: wrap; }
    .match-row.played { background: rgba(34,197,94,0.08); border-color: #166534; opacity: 0.7; }
    .match-row.active-live { border-color: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.3); }
    .match-role-badge { background: #30363d; color: #c9d1d9; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; }
    .m-team { font-weight: 700; font-size: 0.95rem; flex: 1; }
    .m-team.home { text-align: right; }
    .m-team.away { text-align: left; }
    .score-pair { display: flex; align-items: center; gap: 0.35rem; justify-content: center; min-width: 80px; margin: 0 1rem; }
    .colon { font-weight: 800; color: #8b949e; }
    .final-score { font-size: 1.1rem; font-weight: 800; min-width: 2rem; text-align: center; color: #c9d1d9; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly tournamentService = inject(TournamentService);

  readonly teams = this.tournamentService.teams;
  readonly timer = this.tournamentService.timer;
  readonly liveMatch = this.tournamentService.liveMatch;
  readonly teamNameById = computed(() => new Map(this.teams().map((team) => [team.id, team.name])));
  
  readonly liveHomeName = computed(() => this.teamNameById().get(this.liveMatch().homeTeamId ?? '') ?? 'Heim');
  readonly liveAwayName = computed(() => this.teamNameById().get(this.liveMatch().awayTeamId ?? '') ?? 'Gast');

  readonly formattedTimer = computed(() => {
    const remainingSeconds = this.timer().remainingSeconds;
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  });

  readonly teamForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    groupId: ['', Validators.required]
  });

  readonly liveForm = this.formBuilder.nonNullable.group({
    matchDurationMinutes: [20, [Validators.required, Validators.min(1)]],
  });

  readonly groupColors = GROUP_COLORS;
  readonly groups = this.tournamentService.groups;
  readonly groupMatches = this.tournamentService.groupMatches;
  readonly knockoutMatches = this.tournamentService.knockoutMatches;

  newGroupName = '';
  selectedColor = GROUP_COLORS[0];

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
      this.liveForm.patchValue({ matchDurationMinutes: timer.matchDurationMinutes }, { emitEvent: false });
    });
  }

  addGroup(): void {
    if (!this.newGroupName.trim()) return;
    this.tournamentService.addGroup(this.newGroupName.trim(), this.selectedColor);
    this.newGroupName = '';
    const idx = this.groupColors.indexOf(this.selectedColor);
    this.selectedColor = this.groupColors[(idx + 1) % this.groupColors.length];
  }

  removeGroup(groupId: string): void { 
    this.tournamentService.removeGroup(groupId); 
  }

  addTeam(): void {
    if (this.teamForm.invalid) return;
    const name = this.teamForm.controls.name.value;
    const groupId = this.teamForm.controls.groupId.value;
    
    const tempTeamsBefore = this.tournamentService.teams().length;
    this.tournamentService.addTeam(name);

    setTimeout(() => {
      const teamsList = this.tournamentService.teams();
      const newTeam = teamsList[teamsList.length - 1];
      if (newTeam && teamsList.length > tempTeamsBefore) {
        this.tournamentService.addTeamToGroup(groupId, newTeam.id);
      }
    }, 10);
    
    this.teamForm.controls.name.setValue('');
  }

  removeTeamAndFromGroup(groupId: string, teamId: string): void {
    this.tournamentService.removeTeamFromGroup(groupId, teamId);
    this.tournamentService.removeTeam(teamId);
  }

  saveLiveSettings(): void {
    if (this.liveForm.invalid) return;
    const values = this.liveForm.getRawValue();
    this.tournamentService.setMatchDurationMinutes(values.matchDurationMinutes);
  }

  changeScore(team: 'home' | 'away', delta: number): void {
    if (!this.liveMatch().matchId) return;
    const currentHome = this.liveMatch().homeScore;
    const currentAway = this.liveMatch().awayScore;
    
    if (team === 'home') {
      this.tournamentService.updateLiveScore(currentHome + delta, currentAway);
    } else {
      this.tournamentService.updateLiveScore(currentHome, currentAway + delta);
    }
  }

  startTimer(): void { this.tournamentService.startTimer(); }
  pauseTimer(): void { this.tournamentService.pauseTimer(); }
  resetTimer(): void { this.tournamentService.resetTimer(); }

  playMatch(matchId: string, type: 'group' | 'knockout'): void {
    this.tournamentService.setupLiveMatch(matchId, type);
    // Scroll to top
    document.getElementById('live-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  finishMatchManually(): void {
    this.tournamentService.finishLiveMatch();
    this.tournamentService.setupLiveMatch('', 'group');
  }

  generateGroupMatches(): void { 
    this.tournamentService.regenerateGroupMatches(); 
  }
  
  generateBracket(): void { 
    this.tournamentService.generateKnockoutBracket(); 
  }

}
