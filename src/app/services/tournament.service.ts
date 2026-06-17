import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface Team {
  id: string;
  name: string;
}

export interface ScheduledMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  startTime: string;
}

export interface LiveMatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
}

export interface TournamentTimerState {
  matchDurationMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
  color: string;
}

export interface GroupMatch {
  id: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

export interface KnockoutMatch {
  id: string;
  label: string;
  round: 'semifinal' | 'final';
  position: number;
  homeSlotLabel: string;
  awaySlotLabel: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

export interface TeamStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface TournamentState {
  teams: Team[];
  schedule: ScheduledMatch[];
  liveMatch: LiveMatch;
  timer: TournamentTimerState;
  groups: Group[];
  groupMatches: GroupMatch[];
  knockoutMatches: KnockoutMatch[];
}

export const GROUP_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6'];

const DEFAULT_MATCH_DURATION_MINUTES = 20;
export const TOURNAMENT_STORAGE_KEY = 'tournament-manager.state';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private readonly destroyRef = inject(DestroyRef);
  private timerSubscription: Subscription | null = null;

  private readonly stateSignal = signal<TournamentState>(this.restoreState());

  readonly state = this.stateSignal.asReadonly();
  readonly teams = computed(() => this.stateSignal().teams);
  readonly schedule = computed(() => this.stateSignal().schedule);
  readonly liveMatch = computed(() => this.stateSignal().liveMatch);
  readonly timer = computed(() => this.stateSignal().timer);
  readonly groups = computed(() => this.stateSignal().groups);
  readonly groupMatches = computed(() => this.stateSignal().groupMatches);
  readonly knockoutMatches = computed(() => this.stateSignal().knockoutMatches);

  addTeam(name: string): void {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return;
    }

    this.stateSignal.update((state) => ({
      ...state,
      teams: [
        ...state.teams,
        {
          id: this.createId(),
          name: normalizedName,
        },
      ],
    }));
    this.persistState(this.stateSignal());
  }

  removeTeam(teamId: string): void {
    this.stateSignal.update((state) => {
      const liveMatch = {
        ...state.liveMatch,
        homeTeamId: state.liveMatch.homeTeamId === teamId ? null : state.liveMatch.homeTeamId,
        awayTeamId: state.liveMatch.awayTeamId === teamId ? null : state.liveMatch.awayTeamId,
      };

      return {
        ...state,
        teams: state.teams.filter((team) => team.id !== teamId),
        schedule: state.schedule.filter((match) => match.homeTeamId !== teamId && match.awayTeamId !== teamId),
        liveMatch,
      };
    });
    this.persistState(this.stateSignal());
  }

  setSchedule(matches: readonly ScheduledMatch[]): void {
    this.stateSignal.update((state) => ({
      ...state,
      schedule: [...matches],
    }));
    this.persistState(this.stateSignal());
  }

  upsertScheduleMatch(match: Omit<ScheduledMatch, 'id'> & { id?: string }): void {
    const resolvedMatch: ScheduledMatch = {
      ...match,
      id: match.id ?? this.createId(),
    };

    this.stateSignal.update((state) => {
      const existingIndex = state.schedule.findIndex((item) => item.id === resolvedMatch.id);
      const schedule = [...state.schedule];

      if (existingIndex === -1) {
        schedule.push(resolvedMatch);
      } else {
        schedule.splice(existingIndex, 1, resolvedMatch);
      }

      return {
        ...state,
        schedule,
      };
    });
    this.persistState(this.stateSignal());
  }

  removeScheduleMatch(matchId: string): void {
    this.stateSignal.update((state) => ({
      ...state,
      schedule: state.schedule.filter((match) => match.id !== matchId),
    }));
    this.persistState(this.stateSignal());
  }

  setLiveMatchTeams(homeTeamId: string | null, awayTeamId: string | null): void {
    this.stateSignal.update((state) => ({
      ...state,
      liveMatch: {
        ...state.liveMatch,
        homeTeamId,
        awayTeamId,
      },
    }));
    this.persistState(this.stateSignal());
  }

  updateLiveScore(homeScore: number, awayScore: number): void {
    this.stateSignal.update((state) => ({
      ...state,
      liveMatch: {
        ...state.liveMatch,
        homeScore: Math.max(0, Math.floor(homeScore)),
        awayScore: Math.max(0, Math.floor(awayScore)),
      },
    }));
    this.persistState(this.stateSignal());
  }

  setMatchDurationMinutes(matchDurationMinutes: number): void {
    const normalizedDuration = Math.max(1, Math.floor(matchDurationMinutes));

    this.stateSignal.update((state) => ({
      ...state,
      timer: {
        ...state.timer,
        matchDurationMinutes: normalizedDuration,
        remainingSeconds: state.timer.isRunning ? state.timer.remainingSeconds : normalizedDuration * 60,
      },
    }));
    this.persistState(this.stateSignal());
  }

  startTimer(): void {
    if (this.timerSubscription || this.stateSignal().timer.isRunning) {
      return;
    }

    this.stateSignal.update((state) => {
      const remainingSeconds = state.timer.remainingSeconds > 0 ? state.timer.remainingSeconds : state.timer.matchDurationMinutes * 60;

      return {
        ...state,
        timer: {
          ...state.timer,
          remainingSeconds,
          isRunning: true,
        },
      };
    });
    this.persistState(this.stateSignal());

    this.timerSubscription = interval(1_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tickTimer());
  }

  pauseTimer(): void {
    this.clearTimerSubscription();
    this.stateSignal.update((state) => ({
      ...state,
      timer: {
        ...state.timer,
        isRunning: false,
      },
    }));
    this.persistState(this.stateSignal());
  }

  resetTimer(): void {
    this.clearTimerSubscription();
    this.stateSignal.update((state) => ({
      ...state,
      timer: {
        ...state.timer,
        isRunning: false,
        remainingSeconds: state.timer.matchDurationMinutes * 60,
      },
    }));
    this.persistState(this.stateSignal());
  }

  addGroup(name: string, color: string): void {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    this.stateSignal.update((state) => ({
      ...state,
      groups: [...state.groups, { id: this.createId(), name: normalizedName, teamIds: [], color }],
    }));
    this.persistState(this.stateSignal());
  }

  removeGroup(groupId: string): void {
    this.stateSignal.update((state) => ({
      ...state,
      groups: state.groups.filter((g) => g.id !== groupId),
      groupMatches: state.groupMatches.filter((m) => m.groupId !== groupId),
    }));
    this.persistState(this.stateSignal());
  }

  addTeamToGroup(groupId: string, teamId: string): void {
    this.stateSignal.update((state) => ({
      ...state,
      groups: state.groups.map((g) => {
        if (g.id !== groupId || g.teamIds.includes(teamId)) return g;
        return { ...g, teamIds: [...g.teamIds, teamId] };
      }),
      // Remove from other groups
    }));
    // Remove from other groups
    this.stateSignal.update((state) => ({
      ...state,
      groups: state.groups.map((g) => (g.id === groupId ? g : { ...g, teamIds: g.teamIds.filter((id) => id !== teamId) })),
    }));
    this.persistState(this.stateSignal());
  }

  removeTeamFromGroup(groupId: string, teamId: string): void {
    this.stateSignal.update((state) => ({
      ...state,
      groups: state.groups.map((g) => (g.id !== groupId ? g : { ...g, teamIds: g.teamIds.filter((id) => id !== teamId) })),
      groupMatches: state.groupMatches.filter((m) => !(m.groupId === groupId && (m.homeTeamId === teamId || m.awayTeamId === teamId))),
    }));
    this.persistState(this.stateSignal());
  }

  generateGroupMatches(): void {
    const state = this.stateSignal();
    const newMatches: GroupMatch[] = [];

    for (const group of state.groups) {
      const existing = state.groupMatches.filter((m) => m.groupId === group.id);
      if (existing.length > 0) continue; // already generated for this group

      for (let i = 0; i < group.teamIds.length; i++) {
        for (let j = i + 1; j < group.teamIds.length; j++) {
          newMatches.push({
            id: this.createId(),
            groupId: group.id,
            homeTeamId: group.teamIds[i],
            awayTeamId: group.teamIds[j],
            homeScore: null,
            awayScore: null,
            played: false,
          });
        }
      }
    }

    if (newMatches.length > 0) {
      this.stateSignal.update((s) => ({ ...s, groupMatches: [...s.groupMatches, ...newMatches] }));
      this.persistState(this.stateSignal());
    }
  }

  regenerateGroupMatches(): void {
    const state = this.stateSignal();
    const newMatches: GroupMatch[] = [];

    for (const group of state.groups) {
      for (let i = 0; i < group.teamIds.length; i++) {
        for (let j = i + 1; j < group.teamIds.length; j++) {
          newMatches.push({
            id: this.createId(),
            groupId: group.id,
            homeTeamId: group.teamIds[i],
            awayTeamId: group.teamIds[j],
            homeScore: null,
            awayScore: null,
            played: false,
          });
        }
      }
    }

    this.stateSignal.update((s) => ({ ...s, groupMatches: newMatches }));
    this.persistState(this.stateSignal());
  }

  updateGroupMatchResult(matchId: string, homeScore: number | null, awayScore: number | null, played: boolean): void {
    this.stateSignal.update((state) => ({
      ...state,
      groupMatches: state.groupMatches.map((m) =>
        m.id !== matchId ? m : { ...m, homeScore, awayScore, played },
      ),
    }));
    this.persistState(this.stateSignal());
  }

  computeGroupStandings(groupId: string): TeamStanding[] {
    const state = this.stateSignal();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return [];

    const standings: Map<string, TeamStanding> = new Map(
      group.teamIds.map((teamId) => [teamId, { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]),
    );

    for (const match of state.groupMatches.filter((m) => m.groupId === groupId && m.played)) {
      const home = standings.get(match.homeTeamId);
      const away = standings.get(match.awayTeamId);
      const hs = match.homeScore ?? 0;
      const as_ = match.awayScore ?? 0;

      if (home) {
        home.played++;
        home.goalsFor += hs;
        home.goalsAgainst += as_;
        if (hs > as_) { home.won++; home.points += 3; }
        else if (hs === as_) { home.drawn++; home.points += 1; }
        else { home.lost++; }
      }
      if (away) {
        away.played++;
        away.goalsFor += as_;
        away.goalsAgainst += hs;
        if (as_ > hs) { away.won++; away.points += 3; }
        else if (as_ === hs) { away.drawn++; away.points += 1; }
        else { away.lost++; }
      }
    }

    return [...standings.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
  }

  generateKnockoutBracket(): void {
    const state = this.stateSignal();
    if (state.groups.length < 2) return;

    const groupA = state.groups[0];
    const groupB = state.groups[1];
    const standingsA = this.computeGroupStandings(groupA.id);
    const standingsB = this.computeGroupStandings(groupB.id);

    const a1 = standingsA[0]?.teamId ?? null;
    const a2 = standingsA[1]?.teamId ?? null;
    const b1 = standingsB[0]?.teamId ?? null;
    const b2 = standingsB[1]?.teamId ?? null;

    const sf1Id = this.createId();
    const sf2Id = this.createId();
    const finalId = this.createId();

    const knockoutMatches: KnockoutMatch[] = [
      {
        id: sf1Id,
        label: 'Halbfinale 1',
        round: 'semifinal',
        position: 1,
        homeSlotLabel: `1. ${groupA.name}`,
        awaySlotLabel: `2. ${groupB.name}`,
        homeTeamId: a1,
        awayTeamId: b2,
        homeScore: null,
        awayScore: null,
        played: false,
      },
      {
        id: sf2Id,
        label: 'Halbfinale 2',
        round: 'semifinal',
        position: 2,
        homeSlotLabel: `1. ${groupB.name}`,
        awaySlotLabel: `2. ${groupA.name}`,
        homeTeamId: b1,
        awayTeamId: a2,
        homeScore: null,
        awayScore: null,
        played: false,
      },
      {
        id: finalId,
        label: 'Finale',
        round: 'final',
        position: 1,
        homeSlotLabel: 'Sieger HF 1',
        awaySlotLabel: 'Sieger HF 2',
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        played: false,
      },
    ];

    this.stateSignal.update((s) => ({ ...s, knockoutMatches }));
    this.persistState(this.stateSignal());
  }

  updateKnockoutResult(matchId: string, homeScore: number | null, awayScore: number | null, played: boolean): void {
    this.stateSignal.update((state) => {
      const updatedMatches = state.knockoutMatches.map((m) =>
        m.id !== matchId ? m : { ...m, homeScore, awayScore, played },
      );

      // Propagate winners to final
      const sf1 = updatedMatches.find((m) => m.round === 'semifinal' && m.position === 1);
      const sf2 = updatedMatches.find((m) => m.round === 'semifinal' && m.position === 2);

      const getWinner = (m: KnockoutMatch): string | null => {
        if (!m.played || m.homeScore === null || m.awayScore === null) return null;
        if (m.homeScore > m.awayScore) return m.homeTeamId;
        if (m.awayScore > m.homeScore) return m.awayTeamId;
        return null;
      };

      const finalMatches = updatedMatches.map((m) => {
        if (m.round !== 'final') return m;
        return { ...m, homeTeamId: sf1 ? getWinner(sf1) : m.homeTeamId, awayTeamId: sf2 ? getWinner(sf2) : m.awayTeamId };
      });

      return { ...state, knockoutMatches: finalMatches };
    });
    this.persistState(this.stateSignal());
  }

  private tickTimer(): void {
    let hasExpired = false;

    this.stateSignal.update((state) => {
      const remainingSeconds = Math.max(0, state.timer.remainingSeconds - 1);
      hasExpired = remainingSeconds === 0;

      return {
        ...state,
        timer: {
          ...state.timer,
          isRunning: hasExpired ? false : state.timer.isRunning,
          remainingSeconds,
        },
      };
    });
    this.persistState(this.stateSignal());

    if (hasExpired) {
      this.clearTimerSubscription();
    }
  }

  private clearTimerSubscription(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = null;
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private restoreState(): TournamentState {
    if (typeof localStorage === 'undefined') {
      return this.createDefaultState();
    }

    const storedState = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
    if (!storedState) {
      return this.createDefaultState();
    }

    try {
      const parsed = JSON.parse(storedState) as Partial<TournamentState>;
      return this.normalizeState(parsed);
    } catch {
      return this.createDefaultState();
    }
  }

  private persistState(state: TournamentState): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(state));
  }

  private createDefaultState(): TournamentState {
    return {
      teams: [],
      schedule: [],
      liveMatch: {
        homeTeamId: null,
        awayTeamId: null,
        homeScore: 0,
        awayScore: 0,
      },
      timer: {
        matchDurationMinutes: DEFAULT_MATCH_DURATION_MINUTES,
        remainingSeconds: DEFAULT_MATCH_DURATION_MINUTES * 60,
        isRunning: false,
      },
      groups: [],
      groupMatches: [],
      knockoutMatches: [],
    };
  }

  private normalizeState(state: Partial<TournamentState>): TournamentState {
    const fallback = this.createDefaultState();
    const teams = Array.isArray(state.teams)
      ? state.teams
          .filter((team): team is Team => !!team && typeof team.id === 'string' && typeof team.name === 'string')
          .map((team) => ({ id: team.id, name: team.name.trim() }))
      : [];
    const validTeamIds = new Set(teams.map((team) => team.id));
    const schedule = Array.isArray(state.schedule)
      ? state.schedule
          .filter(
            (match): match is ScheduledMatch =>
              !!match &&
              typeof match.id === 'string' &&
              typeof match.homeTeamId === 'string' &&
              typeof match.awayTeamId === 'string' &&
              typeof match.startTime === 'string',
          )
          .filter((match) => validTeamIds.has(match.homeTeamId) && validTeamIds.has(match.awayTeamId))
      : [];
    const liveMatch = state.liveMatch;
    const homeTeamId = liveMatch?.homeTeamId ?? fallback.liveMatch.homeTeamId;
    const awayTeamId = liveMatch?.awayTeamId ?? fallback.liveMatch.awayTeamId;
    const timer = state.timer;
    const matchDurationMinutes = Math.max(1, Math.floor(timer?.matchDurationMinutes ?? fallback.timer.matchDurationMinutes));
    const remainingSeconds = Math.max(0, Math.floor(timer?.remainingSeconds ?? matchDurationMinutes * 60));

    const groups: Group[] = Array.isArray(state.groups)
      ? state.groups
          .filter((g): g is Group => !!g && typeof g.id === 'string' && typeof g.name === 'string' && typeof g.color === 'string')
          .map((g) => ({ id: g.id, name: g.name.trim(), color: g.color, teamIds: Array.isArray(g.teamIds) ? g.teamIds.filter((id) => validTeamIds.has(id)) : [] }))
      : [];
    const validGroupIds = new Set(groups.map((g) => g.id));

    const groupMatches: GroupMatch[] = Array.isArray(state.groupMatches)
      ? state.groupMatches.filter(
          (m): m is GroupMatch =>
            !!m &&
            typeof m.id === 'string' &&
            typeof m.groupId === 'string' &&
            validGroupIds.has(m.groupId) &&
            typeof m.homeTeamId === 'string' &&
            typeof m.awayTeamId === 'string' &&
            validTeamIds.has(m.homeTeamId) &&
            validTeamIds.has(m.awayTeamId),
        )
      : [];

    const knockoutMatches: KnockoutMatch[] = Array.isArray(state.knockoutMatches)
      ? state.knockoutMatches.filter(
          (m): m is KnockoutMatch =>
            !!m && typeof m.id === 'string' && typeof m.label === 'string' && (m.round === 'semifinal' || m.round === 'final'),
        )
      : [];

    return {
      teams,
      schedule,
      liveMatch: {
        homeTeamId: typeof homeTeamId === 'string' && validTeamIds.has(homeTeamId) ? homeTeamId : null,
        awayTeamId: typeof awayTeamId === 'string' && validTeamIds.has(awayTeamId) ? awayTeamId : null,
        homeScore: Math.max(0, Math.floor(liveMatch?.homeScore ?? 0)),
        awayScore: Math.max(0, Math.floor(liveMatch?.awayScore ?? 0)),
      },
      timer: {
        matchDurationMinutes,
        remainingSeconds: remainingSeconds > matchDurationMinutes * 60 ? matchDurationMinutes * 60 : remainingSeconds,
        isRunning: false,
      },
      groups,
      groupMatches,
      knockoutMatches,
    };
  }
}
