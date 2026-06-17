import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GROUP_COLORS, Group, GroupMatch, TeamStanding, TournamentService } from '../../services/tournament.service';

interface GroupViewModel {
  group: Group;
  standings: TeamStanding[];
  matches: (GroupMatch & { homeTeamName: string; awayTeamName: string })[];
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="header">
        <h1>Gruppenphase</h1>
        <nav class="nav">
          <a routerLink="/config">Konfiguration</a>
          <a routerLink="/bracket">Turnierplan</a>
          <a routerLink="/live">Live Display</a>
        </nav>
      </header>

      <!-- Create Group -->
      <section class="card">
        <h2>Gruppe erstellen</h2>
        <div class="row">
          <input type="text" placeholder="Gruppenname (z.B. Gruppe A)" [(ngModel)]="newGroupName" />
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
          <button type="button" (click)="addGroup()" [disabled]="!newGroupName.trim()">Gruppe hinzufügen</button>
        </div>
      </section>

      <!-- Assign Teams to Groups -->
      @if (groups().length > 0) {
        <section class="card">
          <h2>Teams zuweisen</h2>
          @if (unassignedTeams().length === 0 && teams().length === 0) {
            <p class="empty">Bitte zuerst Teams in der Konfiguration anlegen.</p>
          } @else {
            <div class="assignment-grid">
              @for (group of groups(); track group.id) {
                <div class="group-box" [style.border-color]="group.color" [style.background]="group.color + '18'">
                  <h3 [style.color]="group.color">{{ group.name }}</h3>
                  <div class="group-teams">
                    @for (teamId of group.teamIds; track teamId) {
                      <div class="team-badge" [style.background]="group.color + '33'" [style.border-color]="group.color">
                        <span>{{ teamNameById().get(teamId) }}</span>
                        <button type="button" class="remove-btn" (click)="removeTeamFromGroup(group.id, teamId)">✕</button>
                      </div>
                    }
                    @if (group.teamIds.length === 0) {
                      <p class="empty-small">Noch keine Teams</p>
                    }
                  </div>
                  <select class="add-team-select" (change)="onAddTeam(group.id, $event)">
                    <option value="">Team hinzufügen…</option>
                    @for (team of availableTeamsForGroup(group.id); track team.id) {
                      <option [value]="team.id">{{ team.name }}</option>
                    }
                  </select>
                  <button type="button" class="danger-btn" (click)="removeGroup(group.id)">Gruppe löschen</button>
                </div>
              }
              @if (unassignedTeams().length > 0) {
                <div class="group-box unassigned">
                  <h3>Nicht zugewiesen</h3>
                  <div class="group-teams">
                    @for (team of unassignedTeams(); track team.id) {
                      <div class="team-badge">
                        <span>{{ team.name }}</span>
                      </div>
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
        <section class="card group-section" [style.border-color]="vm.group.color">
          <div class="group-header" [style.background]="vm.group.color">
            <h2>{{ vm.group.name }}</h2>
          </div>

          <!-- Standings Table -->
          @if (vm.standings.length > 0) {
            <div class="standings">
              <h3>Tabelle</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Sp</th>
                    <th>S</th>
                    <th>U</th>
                    <th>N</th>
                    <th>T</th>
                    <th>Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of vm.standings; track row.teamId; let i = $index) {
                    <tr [class.leader]="i === 0" [class.second]="i === 1">
                      <td>{{ i + 1 }}</td>
                      <td class="team-name">{{ teamNameById().get(row.teamId) }}</td>
                      <td>{{ row.played }}</td>
                      <td>{{ row.won }}</td>
                      <td>{{ row.drawn }}</td>
                      <td>{{ row.lost }}</td>
                      <td>{{ row.goalsFor }}:{{ row.goalsAgainst }}</td>
                      <td class="points">{{ row.points }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Group Matches -->
          @if (vm.group.teamIds.length >= 2) {
            <div class="matches-section">
              <div class="matches-header">
                <h3>Spiele</h3>
                @if (vm.matches.length === 0) {
                  <button type="button" (click)="generateMatches()">Spielplan generieren</button>
                } @else {
                  <button type="button" class="secondary-btn" (click)="regenerateMatches()">Spielplan neu generieren</button>
                }
              </div>
              @if (vm.matches.length === 0) {
                <p class="empty">Noch keine Spiele generiert.</p>
              } @else {
                <div class="match-list">
                  @for (match of vm.matches; track match.id) {
                    <div class="match-row" [class.played]="match.played">
                      <span class="match-team home">{{ match.homeTeamName }}</span>
                      <div class="score-input">
                        <input
                          type="number"
                          min="0"
                          class="score-box"
                          [value]="match.homeScore ?? ''"
                          (change)="onScoreChange(match.id, 'home', $event)"
                          placeholder="–"
                        />
                        <span class="colon">:</span>
                        <input
                          type="number"
                          min="0"
                          class="score-box"
                          [value]="match.awayScore ?? ''"
                          (change)="onScoreChange(match.id, 'away', $event)"
                          placeholder="–"
                        />
                      </div>
                      <span class="match-team away">{{ match.awayTeamName }}</span>
                      <button
                        type="button"
                        class="played-btn"
                        [class.active]="match.played"
                        (click)="togglePlayed(match)"
                      >
                        {{ match.played ? '✓ Gespielt' : 'Als gespielt markieren' }}
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <p class="empty">Mindestens 2 Teams benötigt, um Spiele zu generieren.</p>
          }
        </section>
      }

      @if (groups().length === 0) {
        <p class="empty-hint">Noch keine Gruppen erstellt. Füge oben eine Gruppe hinzu.</p>
      }
    </main>
  `,
  styles: `
    .page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1rem;
      display: grid;
      gap: 1.25rem;
    }
    .header, .nav, .row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .header { justify-content: space-between; }
    .card {
      border: 2px solid #e5e7eb;
      border-radius: 14px;
      padding: 1rem;
      display: grid;
      gap: 0.85rem;
      overflow: hidden;
    }
    .group-section {
      border-width: 2px;
      padding: 0;
    }
    .group-header {
      padding: 0.6rem 1rem;
      color: #fff;
      border-radius: 12px 12px 0 0;
    }
    .group-header h2 { margin: 0; font-size: 1.1rem; }
    .standings, .matches-section { padding: 0 1rem 0.5rem; }
    .matches-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    h2 { margin: 0; }
    h3 { margin: 0 0 0.5rem; font-size: 0.95rem; color: #374151; }

    /* Color picker */
    .color-picker { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
    .color-swatch {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 3px solid transparent;
      cursor: pointer;
      transition: transform 0.1s, border-color 0.1s;
    }
    .color-swatch.selected { border-color: #111; transform: scale(1.15); }
    .color-swatch:hover { transform: scale(1.1); }

    /* Assignment grid */
    .assignment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.85rem;
    }
    .group-box {
      border: 2px solid #d1d5db;
      border-radius: 10px;
      padding: 0.75rem;
      display: grid;
      gap: 0.5rem;
    }
    .group-box.unassigned { border-style: dashed; }
    .group-box h3 { margin: 0; font-size: 0.9rem; font-weight: 700; }
    .group-teams { display: flex; flex-wrap: wrap; gap: 0.4rem; min-height: 32px; }
    .team-badge {
      display: flex; align-items: center; gap: 0.3rem;
      background: #f3f4f6; border: 1px solid #d1d5db;
      border-radius: 20px; padding: 0.2rem 0.6rem;
      font-size: 0.85rem;
    }
    .remove-btn {
      background: none; border: none; cursor: pointer;
      color: #6b7280; font-size: 0.75rem; padding: 0; line-height: 1;
    }
    .remove-btn:hover { color: #ef4444; }
    .add-team-select { padding: 0.35rem; border-radius: 6px; border: 1px solid #d1d5db; font-size: 0.85rem; }
    .danger-btn {
      background: #fef2f2; color: #ef4444; border: 1px solid #fecaca;
      border-radius: 6px; padding: 0.3rem 0.6rem; cursor: pointer; font-size: 0.8rem;
    }
    .danger-btn:hover { background: #fee2e2; }
    .empty-small { margin: 0; font-size: 0.8rem; color: #9ca3af; }

    /* Standings table */
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; padding: 0.35rem 0.5rem; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #f3f4f6; }
    .team-name { font-weight: 600; }
    .points { font-weight: 700; }
    tr.leader td { background: #f0fdf4; }
    tr.second td { background: #eff6ff; }

    /* Match list */
    .match-list { display: grid; gap: 0.5rem; }
    .match-row {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.5rem 0.75rem;
      background: #f9fafb; border-radius: 8px;
      border: 1px solid #e5e7eb;
      flex-wrap: wrap;
    }
    .match-row.played { background: #f0fdf4; border-color: #bbf7d0; }
    .match-team { font-weight: 600; font-size: 0.9rem; flex: 1; min-width: 80px; }
    .match-team.home { text-align: right; }
    .match-team.away { text-align: left; }
    .score-input { display: flex; align-items: center; gap: 0.3rem; }
    .score-box {
      width: 48px; text-align: center;
      padding: 0.3rem; border: 1px solid #d1d5db;
      border-radius: 6px; font-weight: 700; font-size: 1rem;
    }
    .colon { font-weight: 700; font-size: 1.1rem; }
    .played-btn {
      font-size: 0.78rem; padding: 0.25rem 0.55rem;
      border: 1px solid #d1d5db; border-radius: 20px;
      background: #fff; cursor: pointer; white-space: nowrap;
    }
    .played-btn.active { background: #dcfce7; border-color: #86efac; color: #166534; }
    .played-btn:hover { border-color: #9ca3af; }

    .secondary-btn {
      font-size: 0.82rem; padding: 0.3rem 0.7rem;
      background: #f3f4f6; border: 1px solid #d1d5db;
      border-radius: 6px; cursor: pointer;
    }
    .secondary-btn:hover { background: #e5e7eb; }

    .empty { color: #9ca3af; font-size: 0.9rem; margin: 0; }
    .empty-hint { text-align: center; color: #9ca3af; padding: 2rem; }

    input[type="text"] { padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px; }
    button[type="button"]:not(.color-swatch):not(.remove-btn):not(.danger-btn):not(.secondary-btn):not(.played-btn) {
      padding: 0.4rem 0.9rem;
      background: #2563eb; color: #fff;
      border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
    }
    button[type="button"]:not(.color-swatch):not(.remove-btn):not(.danger-btn):not(.secondary-btn):not(.played-btn):hover {
      background: #1d4ed8;
    }
    button[type="button"]:disabled { opacity: 0.5; cursor: default; }
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
    // Advance color for next group
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
