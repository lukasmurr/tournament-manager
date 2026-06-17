import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOURNAMENT_STORAGE_KEY, TournamentService } from './tournament.service';

describe('TournamentService', () => {
  let service: TournamentService;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentService);
  });

  afterEach(() => {
    service.pauseTimer();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('initializes timer from configured duration', () => {
    expect(service.timer().matchDurationMinutes).toBe(20);
    expect(service.timer().remainingSeconds).toBe(1_200);
    expect(service.timer().isRunning).toBe(false);
  });

  it('updates remaining time when duration changes while paused', () => {
    service.setMatchDurationMinutes(15);

    expect(service.timer().matchDurationMinutes).toBe(15);
    expect(service.timer().remainingSeconds).toBe(900);
  });

  it('starts, decrements, and pauses timer accurately', () => {
    service.setMatchDurationMinutes(1);
    service.startTimer();

    vi.advanceTimersByTime(2_000);

    expect(service.timer().remainingSeconds).toBe(58);
    expect(service.timer().isRunning).toBe(true);

    service.pauseTimer();
    vi.advanceTimersByTime(2_000);

    expect(service.timer().remainingSeconds).toBe(58);
    expect(service.timer().isRunning).toBe(false);
  });

  it('resets timer to configured duration and stops running', () => {
    service.setMatchDurationMinutes(1);
    service.startTimer();
    vi.advanceTimersByTime(3_000);

    service.resetTimer();

    expect(service.timer().isRunning).toBe(false);
    expect(service.timer().remainingSeconds).toBe(60);
  });

  it('persists state as json when data changes', () => {
    service.addTeam('Alpha');
    service.addTeam('Beta');
    const [homeTeam, awayTeam] = service.teams();

    service.upsertScheduleMatch({
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      startTime: '2026-06-17T18:00',
    });
    service.setLiveMatchTeams(homeTeam.id, awayTeam.id);
    service.updateLiveScore(3, 1);

    const persistedValue = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
    expect(persistedValue).toBeTruthy();

    const persistedState = JSON.parse(persistedValue ?? '{}') as { teams?: Array<{ name: string }>; liveMatch?: { homeScore?: number } };
    expect(persistedState.teams?.length).toBe(2);
    expect(persistedState.teams?.[0]?.name).toBe('Alpha');
    expect(persistedState.liveMatch?.homeScore).toBe(3);
  });

  it('restores state from persisted json storage', () => {
    localStorage.setItem(
      TOURNAMENT_STORAGE_KEY,
      JSON.stringify({
        teams: [
          { id: 't1', name: 'Team A' },
          { id: 't2', name: 'Team B' },
        ],
        schedule: [{ id: 'm1', homeTeamId: 't1', awayTeamId: 't2', startTime: '2026-06-17T18:30' }],
        liveMatch: { homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 2 },
        timer: { matchDurationMinutes: 25, remainingSeconds: 1_200, isRunning: true },
      }),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restoredService = TestBed.inject(TournamentService);

    expect(restoredService.teams().length).toBe(2);
    expect(restoredService.schedule().length).toBe(1);
    expect(restoredService.liveMatch().homeScore).toBe(2);
    expect(restoredService.timer().matchDurationMinutes).toBe(25);
    expect(restoredService.timer().isRunning).toBe(false);
  });
});
