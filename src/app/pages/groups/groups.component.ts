import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { GROUP_COLORS, Group, GroupMatch, TeamStanding, TournamentService } from '../../services/tournament.service';

interface GroupViewModel {
  group: Group;
  standings: TeamStanding[];
  matches: (GroupMatch & { homeTeamName: string; awayTeamName: string })[];
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [FormsModule, RouterLink, MatToolbar],
  template: `
    <mat-toolbar class="outdoor-toolbar">
      <span class="toolbar-title">👥 Gruppenphase</span>
      <span class="toolbar-spacer"></span>
      <nav class="flex-row">
        <a routerLink="/config" class="nav-link">Konfiguration</a>
        <a routerLink="/bracket" class="nav-link">Turnierplan</a>
        <a routerLink="/live" class="nav-link">Live Display</a>
      </nav>
    </mat-toolbar>

    <div class="page-layout">

      <!-- Create Group -->
      <section class="section-card">
        <h2>Gruppe erstellen</h2>
        <div class="flex-row">
          <input type="text" placeholder="Gruppenname (z.B. Gruppe A)" [(ngModel)]="newGroupName" class="grow-input" />
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
      </section>

      <!-- Assign Teams to Groups -->
      @if (groups().length > 0) {
        <section class="section-card">
          <h2>Teams zuweisen</h2>
          @if (unassignedTeams().length === 0 && teams().length === 0) {
            <p class="empty-hint">Bitte zuerst Teams in der Konfiguration anlegen.</p>
          } @else {
            <div class="assignment-grid">
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
                  <select (change)="onAddTeam(group.id, $event)">
                    <option value="">Team hinzufügen…</option>
                    @for (team of availableTeamsForGroup(group.id); track team.id) {
                      <option [value]="team.id">{{ team.name }}</option>
                    }
                  </select>
                  <button type="button" class="btn-danger sm-btn" (click)="removeGroup(group.id)">Gruppe löschen</button>
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
        </section>
      }

      <!-- Group Matches & Standings -->
      @for (vm of groupViewModels(); track vm.group.id) {
        <section class="section-card group-section" [style.border-color]="vm.group.color">
          <div class="group-header" [style.background]="vm.group.color">
            <h2>{{ vm.group.name }}</h2>
          </div>

          <!-- Standings Table -->
          @if (vm.standings.length > 0) {
            <div class="standings">
              <h3>Tabelle</h3>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>Sp</th>
                      <th>S</th>
                      <th>U</th>
                      <th>N</th>
                      <th>Tore</th>
                      <th>Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of vm.standings; track row.teamId; let i = $index) {
                      <tr [class.leader]="i === 0" [class.second]="i === 1">
                        <td>{{ i + 1 }}</td>
                        <td class="t-name">{{ teamNameById().get(row.teamId) }}</td>
                        <td>{{ row.played }}</td>
                        <td>{{ row.won }}</td>
                        <td>{{ row.drawn }}</td>
                        <td>{{ row.lost }}</td>
                        <td>{{ row.goalsFor }}:{{ row.goalsAgainst }}</td>
                        <td class="t-pts">{{ row.points }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Group Matches -->
          @if (vm.group.teamIds.length >= 2) {
            <div class="matches-section">
              <div class="flex-row">
                <h3>Spiele</h3>
                @if (vm.matches.length === 0) {
                  <button type="button" class="btn-primary sm-btn" (click)="generateMatches()">Spielplan generieren</button>
                } @else {
                  <button type="button" class="btn-secondary sm-btn" (click)="regenerateMatches()">Neu generieren</button>
                }
              </div>
              @if (vm.matches.length === 0) {
                <p class="empty-hint">Noch keine Spiele generiert.</p>
              } @else {
                <div class="match-list">
                  @for (match of vm.matches; track match.id) {
                    <div class="match-row" [class.played]="match.played">
                      <span class="m-team home">{{ match.homeTeamName }}</span>
                      <div class="score-pair">
                        <input
                          type="number" min="0" class="score-box"
                          [value]="match.homeScore ?? ''"
                          (change)="onScoreChange(match.id, 'home', $event)"
                          placeholder="–"
                        />
                        <span class="colon">:</span>
                        <input
                          type="number" min="0" class="score-box"
                          [value]="match.awayScore ?? ''"
                          (change)="onScoreChange(match.id, 'away', $event)"
                          placeholder="–"
                        />
                      </div>
                      <span class="m-team away">{{ match.awayTeamName }}</span>
                      <button
                        type="button"
                        class="played-btn"
                        [class.active]="match.played"
                        (click)="togglePlayed(match)"
                      >{{ match.played ? '✓ Gespielt' : 'Gespielt?' }}</button>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="empty-hint">Mindestens 2 Teams benötigt.</p>
          }
        </section>
      }

      @if (groups().length === 0) {
        <p class="empty-hint" style="text-align:center;padding:2rem">
          Noch keine Gruppen erstellt. Füge oben eine Gruppe hinzu.
        </p>
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
    .grow-input { flex: 1; min-width: 200px; }

    /* Color picker */
    .color-picker { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .color-swatch {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 3px solid transparent;
      cursor: pointer;
      transition: transform 0.1s, border-color 0.1s;
    }
    .color-swatch.selected { border-color: #f0f6fc; transform: scale(1.2); }
    .color-swatch:hover { transform: scale(1.1); }

    /* Assignment grid */
    .assignment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .group-box {
      background: #21262d;
      border: 2px solid #30363d;
      border-radius: 10px;
      padding: 0.9rem;
      display: grid;
      gap: 0.6rem;
    }
    .group-box.unassigned { border-style: dashed; }
    .group-box h3 { margin: 0; font-size: 1rem; font-weight: 700; }
    .group-teams { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 32px; }
    .no-teams { font-size: 0.8rem; color: #8b949e; align-self: center; }
    .unassigned-chip {
      display: inline-flex;
      background: #30363d;
      border: 1px solid #484f58;
      border-radius: 20px;
      padding: 0.25rem 0.65rem;
      font-size: 0.85rem;
      color: #c9d1d9;
    }
    .sm-btn { font-size: 0.85rem !important; padding: 0.3rem 0.75rem !important; }

    /* Group section */
    .group-section { padding: 0 !important; border-width: 2px !important; overflow: hidden; }
    .group-header {
      padding: 0.7rem 1.25rem;
      color: #fff;
      border-radius: 12px 12px 0 0;
    }
    .group-header h2 { margin: 0; font-size: clamp(1rem, 2vw, 1.2rem); }
    .standings, .matches-section { padding: 0.75rem 1.25rem; }

    /* Standings table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: clamp(0.85rem, 1.3vw, 1rem); }
    th {
      text-align: left;
      padding: 0.4rem 0.6rem;
      color: #8b949e;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      border-bottom: 2px solid #30363d;
    }
    td { padding: 0.45rem 0.6rem; border-bottom: 1px solid #21262d; color: #f0f6fc; }
    .t-name { font-weight: 700; }
    .t-pts { font-weight: 800; color: #f59e0b; font-size: 1.05em; }
    tr.leader td { background: rgba(34,197,94,0.12); }
    tr.second td { background: rgba(59,130,246,0.1); }

    /* Match list */
    .match-list { display: grid; gap: 0.5rem; }
    .match-row {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.6rem 0.75rem;
      background: #21262d; border-radius: 8px;
      border: 1px solid #30363d;
      flex-wrap: wrap;
    }
    .match-row.played { background: rgba(34,197,94,0.08); border-color: #166534; }
    .m-team { font-weight: 700; font-size: 0.95rem; flex: 1; min-width: 80px; }
    .m-team.home { text-align: right; }
    .m-team.away { text-align: left; }
    .score-pair { display: flex; align-items: center; gap: 0.35rem; }
    .colon { font-weight: 800; font-size: 1.2rem; color: #c9d1d9; }
    .played-btn {
      font-size: 0.8rem; padding: 0.3rem 0.65rem;
      border: 1px solid #484f58; border-radius: 20px;
      background: #161b22; color: #c9d1d9; cursor: pointer; white-space: nowrap;
    }
    .played-btn.active { background: rgba(34,197,94,0.2); border-color: #22c55e; color: #86efac; }
    .played-btn:hover { border-color: #c9d1d9; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsComponent {
  private readonly service = inject(TournamentService);

  readonly groupColors = GROUP_COLORS;
  readonly teams = this.service.teams;
  readonly groups = this.service.groups;
  readonly groupMatches = this.service.groupMatches;

  newGroupName = '';
  selectedColor = GROUP_COLORS[0];

  readonly teamNameById = computed(() => new Map(this.teams().map((t) => [t.id, t.name])));

  readonly assignedTeamIds = computed(() => {
    const ids = new Set<string>();
    this.groups().forEach((g) => g.teamIds.forEach((id) => ids.add(id)));
    return ids;
  });

  readonly unassignedTeams = computed(() => this.teams().filter((t) => !this.assignedTeamIds().has(t.id)));

  readonly groupViewModels = computed<GroupViewModel[]>(() =>
    this.groups().map((group) => {
      const standings = this.service.computeGroupStandings(group.id);
      const matches = this.groupMatches()
        .filter((m) => m.groupId === group.id)
        .map((m) => ({
          ...m,
          homeTeamName: this.teamNameById().get(m.homeTeamId) ?? 'Unbekannt',
          awayTeamName: this.teamNameById().get(m.awayTeamId) ?? 'Unbekannt',
        }));
      return { group, standings, matches };
    }),
  );

  availableTeamsForGroup(groupId: string): { id: string; name: string }[] {
    const group = this.groups().find((g) => g.id === groupId);
    const inGroup = new Set(group?.teamIds ?? []);
    return this.teams().filter((t) => !inGroup.has(t.id));
  }

  addGroup(): void {
    if (!this.newGroupName.trim()) return;
    this.service.addGroup(this.newGroupName.trim(), this.selectedColor);
    this.newGroupName = '';
    const idx = this.groupColors.indexOf(this.selectedColor);
    this.selectedColor = this.groupColors[(idx + 1) % this.groupColors.length];
  }

  removeGroup(groupId: string): void {
    this.service.removeGroup(groupId);
  }

  onAddTeam(groupId: string, event: Event): void {
    const teamId = (event.target as HTMLSelectElement).value;
    if (!teamId) return;
    this.service.addTeamToGroup(groupId, teamId);
    (event.target as HTMLSelectElement).value = '';
  }

  removeTeamFromGroup(groupId: string, teamId: string): void {
    this.service.removeTeamFromGroup(groupId, teamId);
  }

  generateMatches(): void {
    this.service.generateGroupMatches();
  }

  regenerateMatches(): void {
    this.service.regenerateGroupMatches();
  }

  onScoreChange(matchId: string, side: 'home' | 'away', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const score = val === '' ? null : Math.max(0, parseInt(val, 10));
    const match = this.groupMatches().find((m) => m.id === matchId);
    if (!match) return;

    if (side === 'home') {
      this.service.updateGroupMatchResult(matchId, score, match.awayScore, match.played);
    } else {
      this.service.updateGroupMatchResult(matchId, match.homeScore, score, match.played);
    }
  }

  togglePlayed(match: GroupMatch): void {
    this.service.updateGroupMatchResult(match.id, match.homeScore, match.awayScore, !match.played);
  }
}
