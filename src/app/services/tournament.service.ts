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

export interface TournamentState {
  teams: Team[];
  schedule: ScheduledMatch[];
  liveMatch: LiveMatch;
  timer: TournamentTimerState;
}

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
    };
  }
}
