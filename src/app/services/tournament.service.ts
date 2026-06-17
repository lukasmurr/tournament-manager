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

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private readonly destroyRef = inject(DestroyRef);
  private timerSubscription: Subscription | null = null;

  private readonly stateSignal = signal<TournamentState>({
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
  });

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
  }

  setSchedule(matches: readonly ScheduledMatch[]): void {
    this.stateSignal.update((state) => ({
      ...state,
      schedule: [...matches],
    }));
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
}
