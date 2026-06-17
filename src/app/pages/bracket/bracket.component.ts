import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KnockoutMatch, TournamentService } from '../../services/tournament.service';

interface KnockoutMatchVM extends KnockoutMatch {
  homeTeamName: string;
  awayTeamName: string;
  winnerName: string | null;
}

@Component({
  selector: 'app-bracket',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="page">
      <header class="header">
        <h1>Turnierplan</h1>
        <nav class="nav">
          <a routerLink="/config">Konfiguration</a>
          <a routerLink="/groups">Gruppenphase</a>
          <a routerLink="/live">Live Display</a>
        </nav>
      </header>

      @if (groups().length < 2) {
        <section class="info-card">
          <p>⚠️ Mindestens 2 Gruppen werden benötigt. Bitte zuerst die <a routerLink="/groups">Gruppenphase</a> konfigurieren.</p>
        </section>
      } @else {
        <div class="actions">
          <button type="button" (click)="generate()">
            {{ knockoutMatches().length > 0 ? '🔄 Turnierplan aktualisieren' : '🏆 Turnierplan generieren' }}
          </button>
          <span class="hint">Generiert die K.O.-Runde basierend auf den aktuellen Gruppentabellen.</span>
        </div>

        @if (knockoutMatches().length === 0) {
          <section class="empty-bracket">
            <div class="trophy">🏆</div>
            <p>Noch kein Turnierplan generiert.</p>
          </section>
        } @else {
          <!-- Visual Bracket -->
          <section class="bracket-wrapper">
            <div class="bracket">

              <!-- Semifinals Column -->
              <div class="round semifinals-round">
                <div class="round-label">Halbfinale</div>
                <div class="matches-col">
                  @for (match of semifinals(); track match.id) {
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
                      @if (!match.played) {
                        <div class="score-entry">
                          <input
                            type="number" min="0" class="score-input"
                            [value]="match.homeScore ?? ''"
                            (change)="onScore(match.id, 'home', $event)"
                            placeholder="0"
                          />
                          <span>:</span>
                          <input
                            type="number" min="0" class="score-input"
                            [value]="match.awayScore ?? ''"
                            (change)="onScore(match.id, 'away', $event)"
                            placeholder="0"
                          />
                          <button type="button" class="confirm-btn" (click)="confirmResult(match)">✓</button>
                        </div>
                      } @else {
                        <div class="winner-row">
                          <span class="winner-label">Sieger:</span>
                          <span class="winner-name">{{ match.winnerName ?? '–' }}</span>
                          <button type="button" class="edit-btn" (click)="editResult(match.id)">✎</button>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Bracket Connectors -->
              <div class="connectors" aria-hidden="true">
                <div class="connector-top">
                  <div class="line-h"></div>
                  <div class="line-v"></div>
                </div>
                <div class="connector-mid">
                  <div class="line-h-center"></div>
                </div>
                <div class="connector-bottom">
                  <div class="line-v"></div>
                  <div class="line-h"></div>
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
                    @if (!match.played) {
                      <div class="score-entry">
                        <input
                          type="number" min="0" class="score-input"
                          [value]="match.homeScore ?? ''"
                          (change)="onScore(match.id, 'home', $event)"
                          placeholder="0"
                        />
                        <span>:</span>
                        <input
                          type="number" min="0" class="score-input"
                          [value]="match.awayScore ?? ''"
                          (change)="onScore(match.id, 'away', $event)"
                          placeholder="0"
                        />
                        <button type="button" class="confirm-btn" (click)="confirmResult(match)">✓</button>
                      </div>
                    } @else {
                      <div class="champion-row">
                        <span class="trophy-icon">🏆</span>
                        <span class="champion-name">{{ match.winnerName ?? '–' }}</span>
                        <button type="button" class="edit-btn" (click)="editResult(match.id)">✎</button>
                      </div>
                    }
                  </div>
                }
              </div>

            </div>
          </section>

          <!-- Group Standings Summary -->
          <section class="standings-summary">
            <h2>Gruppentabellen (Übersicht)</h2>
            <div class="standings-grid">
              @for (gs of groupStandings(); track gs.group.id) {
                <div class="standing-card" [style.border-color]="gs.group.color">
                  <div class="standing-header" [style.background]="gs.group.color">{{ gs.group.name }}</div>
                  <ol class="standing-list">
                    @for (row of gs.standings; track row.teamId; let i = $index) {
                      <li [class.advance]="i < 2">
                        <span class="pos-badge" [style.background]="i < 2 ? gs.group.color : '#e5e7eb'">{{ i + 1 }}</span>
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
    </main>
  `,
  styles: `
    .page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1rem;
      display: grid;
      gap: 1.5rem;
    }
    .header, .nav, .actions {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    }
    .header { justify-content: space-between; }
    .hint { font-size: 0.82rem; color: #6b7280; }

    .info-card {
      background: #fffbeb; border: 1px solid #fde68a;
      border-radius: 10px; padding: 1rem;
    }
    .info-card a { color: #2563eb; }

    /* Bracket wrapper */
    .bracket-wrapper {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 2rem 1.5rem;
      overflow-x: auto;
    }
    .bracket {
      display: flex;
      align-items: center;
      gap: 0;
      min-width: 680px;
    }

    /* Round columns */
    .round { display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
    .semifinals-round { width: 260px; }
    .final-round { width: 260px; }
    .round-label {
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: #94a3b8; text-align: center;
      padding-bottom: 0.75rem;
    }
    .matches-col { display: flex; flex-direction: column; gap: 1.5rem; }

    /* Match cards */
    .match-card {
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.75rem;
      display: grid;
      gap: 0.4rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      transition: border-color 0.2s;
    }
    .match-card.played { border-color: #86efac; }
    .match-card.final-card {
      border-color: #fbbf24;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      align-self: center;
    }
    .match-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Team slots */
    .slot {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      background: #f8fafc;
      transition: background 0.15s;
    }
    .slot.winner { background: #dcfce7; }
    .slot-label { font-size: 0.7rem; color: #94a3b8; min-width: 65px; flex-shrink: 0; }
    .team-name { font-weight: 600; font-size: 0.9rem; flex: 1; }
    .score {
      font-weight: 800; font-size: 1.1rem; min-width: 24px;
      text-align: center; color: #1e293b;
    }
    .vs-divider { text-align: center; font-size: 0.75rem; color: #cbd5e1; font-weight: 600; }

    /* Score entry */
    .score-entry {
      display: flex; align-items: center; gap: 0.4rem;
      padding-top: 0.25rem; border-top: 1px solid #f1f5f9;
    }
    .score-input {
      width: 48px; text-align: center; padding: 0.3rem;
      border: 1px solid #cbd5e1; border-radius: 6px;
      font-weight: 700; font-size: 1rem;
    }
    .confirm-btn {
      background: #22c55e; color: #fff; border: none;
      border-radius: 6px; padding: 0.3rem 0.6rem; cursor: pointer; font-weight: 700;
    }
    .confirm-btn:hover { background: #16a34a; }

    /* Winner / Champion rows */
    .winner-row, .champion-row {
      display: flex; align-items: center; gap: 0.5rem;
      padding-top: 0.25rem; border-top: 1px solid #f1f5f9;
    }
    .winner-label { font-size: 0.75rem; color: #6b7280; }
    .winner-name { font-weight: 700; font-size: 0.9rem; color: #166534; flex: 1; }
    .trophy-icon { font-size: 1.2rem; }
    .champion-name { font-weight: 800; font-size: 1rem; color: #92400e; flex: 1; }
    .edit-btn {
      background: none; border: 1px solid #d1d5db; border-radius: 4px;
      cursor: pointer; padding: 0.15rem 0.35rem; font-size: 0.8rem; color: #6b7280;
    }
    .edit-btn:hover { background: #f3f4f6; }

    /* Connector lines */
    .connectors {
      width: 60px; flex-shrink: 0;
      display: flex; flex-direction: column;
      align-self: stretch; padding-top: 26px;
    }
    .connector-top, .connector-bottom {
      flex: 1; display: flex; flex-direction: column;
    }
    .connector-top { justify-content: flex-end; }
    .connector-bottom { justify-content: flex-start; }
    .connector-mid { display: flex; align-items: center; }

    .line-h {
      height: 2px; background: #cbd5e1; width: 50%;
      align-self: center; margin-left: auto;
    }
    .line-v {
      width: 2px; background: #cbd5e1;
      flex: 1; margin-left: auto; margin-right: 0;
    }
    .line-h-center {
      height: 2px; background: #cbd5e1; width: 100%;
    }

    /* Standings summary */
    .standings-summary { display: grid; gap: 0.85rem; }
    .standings-summary h2 { margin: 0; font-size: 1rem; }
    .standings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.85rem;
    }
    .standing-card { border: 2px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .standing-header {
      padding: 0.45rem 0.75rem; color: #fff;
      font-weight: 700; font-size: 0.9rem;
    }
    .standing-list {
      list-style: none; margin: 0; padding: 0.5rem 0.75rem;
      display: grid; gap: 0.35rem;
    }
    .standing-list li {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.875rem;
    }
    .standing-list li.advance { font-weight: 600; }
    .pos-badge {
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .sname { flex: 1; }
    .spts { color: #6b7280; font-size: 0.8rem; }

    .empty-bracket {
      text-align: center; padding: 3rem;
      color: #9ca3af;
    }
    .trophy { font-size: 4rem; margin-bottom: 1rem; }

    button:not(.confirm-btn):not(.edit-btn) {
      padding: 0.45rem 1rem;
      background: #2563eb; color: #fff;
      border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
      font-size: 0.9rem;
    }
    button:not(.confirm-btn):not(.edit-btn):hover { background: #1d4ed8; }
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

  readonly semifinals = computed(() => this.knockoutVMs().filter((m) => m.round === 'semifinal').sort((a, b) => a.position - b.position));
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
