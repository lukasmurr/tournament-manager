import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TournamentService } from './tournament.service';

describe('TournamentService', () => {
  let service: TournamentService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TournamentService);
  });

  afterEach(() => {
    service.pauseTimer();
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
});
