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
      <div class="groups-grid">
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
              <h3>Spiele</h3>
              @if (vm.matches.length === 0) {
                <p class="empty-hint">Noch keine Spiele generiert.</p>
              } @else {
                <div class="match-list">
                  @for (match of vm.matches; track match.id) {
                    <div class="match-row" [class.played]="match.played">
                      <span class="m-team home">{{ match.homeTeamName }}</span>
                      <div class="score-pair">
                        <span class="score-display">{{ match.homeScore ?? '-' }}</span>
                        <span class="colon">:</span>
                        <span class="score-display">{{ match.awayScore ?? '-' }}</span>
                      </div>
                      <span class="m-team away">{{ match.awayTeamName }}</span>
                      @if (match.played) {
                        <span class="played-badge">✓ Gespielt</span>
                      }
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
      </div>

      @if (groups().length === 0) {
        <p class="empty-hint" style="text-align:center;padding:2rem">
          Noch keine Gruppen konfiguriert. Bitte in der Konfiguration anlegen.
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
    
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
      align-items: start;
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

  readonly teams = this.service.teams;
  readonly groups = this.service.groups;
  readonly groupMatches = this.service.groupMatches;

  readonly teamNameById = computed(() => new Map(this.teams().map((t) => [t.id, t.name])));

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
}
