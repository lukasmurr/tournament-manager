import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { KnockoutMatch, TournamentService } from '../../services/tournament.service';

interface KnockoutMatchVM extends KnockoutMatch {
  homeTeamName: string;
  awayTeamName: string;
  winnerName: string | null;
}

@Component({
  selector: 'app-bracket',
  standalone: true,
  imports: [RouterLink, MatToolbar],
  template: `
    <mat-toolbar class="outdoor-toolbar">
      <span class="toolbar-title">🏆 Turnierplan</span>
      <span class="toolbar-spacer"></span>
      <nav class="flex-row">
        <a routerLink="/config" class="nav-link">Konfiguration</a>
        <a routerLink="/groups" class="nav-link">Gruppen</a>
        <a routerLink="/live" class="nav-link">Live Display</a>
      </nav>
    </mat-toolbar>

    <div class="page-layout">

      @if (groups().length === 0) {
        <section class="section-card info-card">
          <p>⚠️ Mindestens 1 Gruppe wird benötigt für den Turnierplan.</p>
        </section>
      } @else {

        @if (knockoutMatches().length === 0) {
          <section class="section-card empty-bracket">
            <div class="trophy-big">🏆</div>
            <p class="empty-hint">Noch kein Turnierplan generiert. (Siehe Konfiguration)</p>
          </section>
        } @else {
          <!-- Visual Bracket: Semifinal 1 -> Final <- Semifinal 2 -->
          <section class="section-card bracket-wrapper">
            <div class="bracket">

              <!-- Left Semifinal -->
              <div class="round semifinals-round">
                <div class="round-label">Halbfinale 1</div>
                <div class="matches-col">
                  @for (match of semifinal1(); track match.id) {
                    <div class="match-card" [class.played]="match.played">
                      <div class="match-label">{{ match.label }}</div>
                      <div class="slot" [class.winner]="match.played && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore">
                        <span class="slot-label">{{ match.homeSlotLabel }}</span>
                        <span class="team-name">{{ match.homeTeamName }}</span>
                        @if (match.played && match.homeScore !== null) {
                          <span class="score">{{ match.homeScore }}</span>
                        }
                      </div>
                      <div class="vs-divider">vs</div>
                      <div class="slot" [class.winner]="match.played && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore">
                        <span class="slot-label">{{ match.awaySlotLabel }}</span>
                        <span class="team-name">{{ match.awayTeamName }}</span>
                        @if (match.played && match.awayScore !== null) {
                          <span class="score">{{ match.awayScore }}</span>
                        }
                      </div>
                      @if (match.played) {
                        <div class="winner-row">
                          <span class="winner-label">Sieger:</span>
                          <span class="winner-name">{{ match.winnerName ?? '–' }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Connector Lines Left -->
              <div class="connectors" aria-hidden="true">
                <div class="connector-single">
                   <div class="line-h-full"></div>
                </div>
              </div>

              <!-- Final Column -->
              <div class="round final-round">
                <div class="round-label">Finale</div>
                @for (match of finals(); track match.id) {
                  <div class="match-card final-card" [class.played]="match.played">
                    <div class="match-label">{{ match.label }}</div>
                    <div class="slot" [class.winner]="match.played && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore">
                      <span class="slot-label">{{ match.homeSlotLabel }}</span>
                      <span class="team-name">{{ match.homeTeamName }}</span>
                      @if (match.played && match.homeScore !== null) {
                        <span class="score">{{ match.homeScore }}</span>
                      }
                    </div>
                    <div class="vs-divider">vs</div>
                    <div class="slot" [class.winner]="match.played && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore">
                      <span class="slot-label">{{ match.awaySlotLabel }}</span>
                      <span class="team-name">{{ match.awayTeamName }}</span>
                      @if (match.played && match.awayScore !== null) {
                        <span class="score">{{ match.awayScore }}</span>
                      }
                    </div>
                    @if (match.played) {
                      <div class="champion-row">
                        <span>🏆</span>
                        <span class="champion-name">{{ match.winnerName ?? '–' }}</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Connector Lines Right -->
              <div class="connectors" aria-hidden="true">
                <div class="connector-single">
                   <div class="line-h-full"></div>
                </div>
              </div>

              <!-- Right Semifinal -->
              <div class="round semifinals-round">
                <div class="round-label">Halbfinale 2</div>
                <div class="matches-col">
                  @for (match of semifinal2(); track match.id) {
                    <div class="match-card" [class.played]="match.played">
                      <div class="match-label">{{ match.label }}</div>
                      <div class="slot" [class.winner]="match.played && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore">
                        <span class="slot-label">{{ match.homeSlotLabel }}</span>
                        <span class="team-name">{{ match.homeTeamName }}</span>
                        @if (match.played && match.homeScore !== null) {
                          <span class="score">{{ match.homeScore }}</span>
                        }
                      </div>
                      <div class="vs-divider">vs</div>
                      <div class="slot" [class.winner]="match.played && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore">
                        <span class="slot-label">{{ match.awaySlotLabel }}</span>
                        <span class="team-name">{{ match.awayTeamName }}</span>
                        @if (match.played && match.awayScore !== null) {
                          <span class="score">{{ match.awayScore }}</span>
                        }
                      </div>
                      @if (match.played) {
                        <div class="winner-row">
                          <span class="winner-label">Sieger:</span>
                          <span class="winner-name">{{ match.winnerName ?? '–' }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

            </div>
          </section>

          <!-- Group Standings Summary -->
          <section class="section-card">
            <h2>Gruppentabellen (Übersicht)</h2>
            <div class="standings-grid">
              @for (gs of groupStandings(); track gs.group.id) {
                <div class="standing-card" [style.border-color]="gs.group.color">
                  <div class="standing-header" [style.background]="gs.group.color">{{ gs.group.name }}</div>
                  <ol class="standing-list">
                    @for (row of gs.standings; track row.teamId; let i = $index) {
                      <li [class.advance]="i < 2">
                        <span class="pos-badge" [style.background]="i < 2 ? gs.group.color : '#30363d'">{{ i + 1 }}</span>
                        <span class="sname">{{ teamNameById().get(row.teamId) }}</span>
                        <span class="spts">{{ row.points }} Pkt.</span>
                      </li>
                    }
                  </ol>
                </div>
              }
            </div>
          </section>
        }
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
    .link { color: #f59e0b; }
    .info-card { border-color: #7c3d00 !important; background: #1c1500 !important; font-size: 1.05rem; }
    .actions-row { align-items: center; }
    .hint-text { font-size: 0.9rem; color: #8b949e; }
    .empty-bracket { text-align: center; padding: 3rem; }
    .trophy-big { font-size: 5rem; margin-bottom: 1rem; }

    /* Bracket layout */
    .bracket-wrapper {
      overflow-x: auto;
      padding: 3rem 1.5rem;
      display: flex;
      justify-content: center;
    }
    .bracket {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      min-width: 1200px;
      margin: 0 auto;
      width: max-content;
    }
    .round { display: flex; flex-direction: column; gap: 1.25rem; flex-shrink: 0; }
    .semifinals-round { width: 380px; }
    .final-round { width: 400px; }
    .round-label {
      font-size: 1.15rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.12em; color: #f59e0b; text-align: center;
      padding-bottom: 1.25rem;
    }
    .matches-col { display: flex; flex-direction: column; gap: 2.5rem; }

    /* Match cards */
    .match-card {
      background: #21262d;
      border: 2px solid #30363d;
      border-radius: 18px;
      padding: 1.5rem;
      display: grid;
      gap: 0.8rem;
      transition: border-color 0.2s, transform 0.2s;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }
    .match-card:hover {
      transform: translateY(-2px);
      border-color: #484f58;
    }
    .match-card.played { border-color: #22c55e; }
    .match-card.final-card {
      border-color: #f59e0b;
      background: #1c1500;
      align-self: center;
      box-shadow: 0 6px 25px rgba(245, 158, 11, 0.15);
    }
    .match-card.final-card:hover {
      border-color: #fbbf24;
    }
    .match-label { font-size: 0.9rem; font-weight: 800; color: #8b949e; text-transform: uppercase; letter-spacing: 0.08em; }
    .slot {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.8rem 1rem;
      border-radius: 12px;
      background: #161b22;
      transition: background-color 0.2s;
    }
    .slot.winner { background: rgba(34,197,94,0.15); border: 2px solid #22c55e; }
    .slot-label { font-size: 0.9rem; color: #8b949e; min-width: 85px; flex-shrink: 0; font-weight: 600; }
    .team-name { font-weight: 700; font-size: 1.25rem; flex: 1; color: #f0f6fc; }
    .score { font-weight: 800; font-size: 1.6rem; min-width: 35px; text-align: center; color: #f59e0b; }
    .vs-divider { text-align: center; font-size: 1rem; color: #484f58; font-weight: 800; letter-spacing: 0.05em; }

    /* Score entry */
    .score-entry {
      display: flex; align-items: center; gap: 0.5rem;
      padding-top: 0.5rem; border-top: 1px solid #30363d;
    }
    .score-input {
      width: 60px; text-align: center; padding: 0.45rem;
      border: 2px solid #484f58; border-radius: 8px;
      font-weight: 800; font-size: 1.15rem;
      background: #161b22; color: #f0f6fc;
    }
    .score-input:focus { border-color: #f59e0b; outline: none; }
    .entry-sep { font-weight: 800; font-size: 1.3rem; color: #c9d1d9; }
    .confirm-btn {
      background: #166534; color: #86efac; border: 1px solid #22c55e;
      border-radius: 8px; padding: 0.45rem 0.85rem; cursor: pointer; font-weight: 700; font-size: 1.05rem;
    }
    .confirm-btn:hover { background: #22c55e; color: #0d1117; }

    /* Winner / Champion rows */
    .winner-row, .champion-row {
      display: flex; align-items: center; gap: 0.6rem;
      padding-top: 0.5rem; border-top: 1px solid #30363d;
    }
    .winner-label { font-size: 0.9rem; color: #8b949e; font-weight: 600; }
    .winner-name { font-weight: 800; font-size: 1.2rem; color: #22c55e; flex: 1; }
    .champion-name { font-weight: 900; font-size: 1.4rem; color: #f59e0b; flex: 1; }
    .edit-btn {
      background: #21262d; border: 1px solid #484f58; border-radius: 6px;
      cursor: pointer; padding: 0.3rem 0.6rem; font-size: 0.9rem; color: #c9d1d9;
      font-weight: 600;
    }
    .edit-btn:hover { border-color: #c9d1d9; color: #f0f6fc; background: #30363d; }

    /* Connectors updated for left -> center <- right layout */
    .connectors {
      width: 80px; flex-shrink: 0;
      display: flex; flex-direction: column;
      align-self: stretch; justify-content: center;
    }
    .connector-single {
      display: flex; align-items: center; width: 100%; height: 100%;
    }
    .line-h-full { height: 2px; background: #484f58; width: 100%; }

    /* Standings summary */
    .standings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .standing-card { border: 2px solid #30363d; border-radius: 10px; overflow: hidden; }
    .standing-header {
      padding: 0.5rem 0.85rem; color: #fff;
      font-weight: 700; font-size: 1rem;
    }
    .standing-list {
      list-style: none; margin: 0; padding: 0.6rem 0.85rem;
      display: grid; gap: 0.4rem;
    }
    .standing-list li {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.95rem; color: #c9d1d9;
    }
    .standing-list li.advance { color: #f0f6fc; font-weight: 700; }
    .pos-badge {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .sname { flex: 1; }
    .spts { color: #8b949e; font-size: 0.85rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BracketComponent {
  private readonly service = inject(TournamentService);

  readonly teams = this.service.teams;
  readonly groups = this.service.groups;
  readonly knockoutMatches = this.service.knockoutMatches;

  readonly teamNameById = computed(() => new Map(this.teams().map((t) => [t.id, t.name])));

  private readonly knockoutVMs = computed<KnockoutMatchVM[]>(() =>
    this.knockoutMatches().map((m) => {
      const homeName = m.homeTeamId ? (this.teamNameById().get(m.homeTeamId) ?? m.homeSlotLabel) : m.homeSlotLabel;
      const awayName = m.awayTeamId ? (this.teamNameById().get(m.awayTeamId) ?? m.awaySlotLabel) : m.awaySlotLabel;
      const winnerName = this.resolveWinner(m);
      return { ...m, homeTeamName: homeName, awayTeamName: awayName, winnerName };
    }),
  );

  readonly semifinals = computed(() =>
    this.knockoutVMs().filter((m) => m.round === 'semifinal').sort((a, b) => a.position - b.position),
  );
  readonly semifinal1 = computed(() => this.semifinals().filter((m) => m.position === 1));
  readonly semifinal2 = computed(() => this.semifinals().filter((m) => m.position === 2));
  
  readonly finals = computed(() => this.knockoutVMs().filter((m) => m.round === 'final'));

  readonly groupStandings = computed(() =>
    this.groups().map((group) => ({
      group,
      standings: this.service.computeGroupStandings(group.id),
    })),
  );

  generate(): void {
    this.service.generateKnockoutBracket();
  }

  onScore(matchId: string, side: 'home' | 'away', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const score = val === '' ? null : Math.max(0, parseInt(val, 10));
    const match = this.knockoutMatches().find((m) => m.id === matchId);
    if (!match) return;

    if (side === 'home') {
      this.service.updateKnockoutResult(matchId, score, match.awayScore, match.played);
    } else {
      this.service.updateKnockoutResult(matchId, match.homeScore, score, match.played);
    }
  }

  confirmResult(match: KnockoutMatch): void {
    this.service.updateKnockoutResult(match.id, match.homeScore, match.awayScore, true);
  }

  editResult(matchId: string): void {
    const match = this.knockoutMatches().find((m) => m.id === matchId);
    if (!match) return;
    this.service.updateKnockoutResult(matchId, match.homeScore, match.awayScore, false);
  }

  private resolveWinner(m: KnockoutMatch): string | null {
    if (!m.played || m.homeScore === null || m.awayScore === null) return null;
    if (m.homeScore > m.awayScore) return m.homeTeamId ? (this.teamNameById().get(m.homeTeamId) ?? m.homeSlotLabel) : m.homeSlotLabel;
    if (m.awayScore > m.homeScore) return m.awayTeamId ? (this.teamNameById().get(m.awayTeamId) ?? m.awaySlotLabel) : m.awaySlotLabel;
    return null;
  }
}
