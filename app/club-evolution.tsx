/* XS_HOME_CLUB_EVOLUTION_HISTORY_V1 */
/* XS_GAMEWEEK_REWARDS_ACCOUNTING_V1 */
/* XS_HOME_AUDIT_FIX_V1 */
/* XS_CLUB_EVOLUTION_DATE_AXIS_V1 */
/* XS_CLUB_EVOLUTION_EVENTS_V1 */
/* XS_SORARE_TRANSACTIONS_V1 */
/* XS_CLUB_EVOLUTION_TRADING_CHART_V1 */
/* XS_CLUB_EVOLUTION_TRANSACTIONS_OVERLAY_V1 */
/* XS_CLUB_EVOLUTION_RANGE_GRAPH_FIX_V1 */
/* XS_CLUB_EVOLUTION_FINANCIAL_CHART_V1 */
/* XS_CLUB_EVOLUTION_GRAPH_TIMELINE_SAFE_FIX_V1 */
/* XS_CLUB_EVOLUTION_COMPLETE_VALUE_HISTORY_SAFE_FIX_V1 */
/* XS_CLUB_EVOLUTION_GRAPH_REDESIGN_SAFE_V1 */
/* XS_CLUB_EVOLUTION_BALANCED_X_SPACING_SAFE_FIX_V1 */
/* XS_CLUB_EVOLUTION_SHARED_FILTER_CHART_SAFE_FIX_V1 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "../src/api";

const DEVICE_ID_KEY = "XS_DEVICE_ID_V1";
const JWT_DEVICE_ID_KEY = "XS_JWT_DEVICE_ID_V1";
const OAUTH_DEVICE_ID_KEY = "xs_device_id";
const CLUB_VALUE_HISTORY_KEY = "club_value_history";
const XS_HOME_AUDIT_FIX_CLOUD_BASE_V1 = "https://xiascor-backend-tssdy62zqa-ez.a.run.app";

type ClubValueHistorySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  clubValueEur: number;
  clubValueText: string;
  pricedCards?: number | null;
  unpricedCards?: number | null;
  cardCount?: number | null;
  coveragePct?: number | null;
  source?: string | null;
  totalInvestedEur?: number | null;
  totalSoldEur?: number | null;
  estimatedProfitEur?: number | null;
  estimatedProfitPct?: number | null;
  bestCardSlug?: string | null;
  bestCardGainEur?: number | null;
  worstCardSlug?: string | null;
  worstCardGainEur?: number | null;
};

type ClubRewardHistoryItem = {
  id?: string | null;
  gameWeekLabel?: string | null;
  competition?: string | null;
  division?: string | null;
  rewardType?: string | null;
  rewardTotalEur?: number | null;
  rewardTotalText?: string | null;
  rewardCashText?: string | null;
  rewardEthText?: string | null;
  rewardCardPlayerName?: string | null;
  rewardCardValueText?: string | null;
  createdAt?: string | null;
};

type ClubTransactionHistoryItem = {
  id?: string | null;
  transactionType?: string | null;
  playerName?: string | null;
  cardSlug?: string | null;
  amountEur?: number | null;
  amountText?: string | null;
  transactionDate?: string | null;
};

type ClubFinancialTimelineEvent = {
  id: string;
  kind: "buy" | "sell" | "reward";
  date: string;
  dateMs: number;
  title: string;
  value: string;
  detail: string;
  positive: boolean;
  amountEur?: number | null;
  count?: number;
  members?: ClubFinancialTimelineEvent[];
};

type ClubEvolutionValueEvent = {
  id: string;
  dateLabel: string;
  deltaValue: number;
  deltaText: string;
  descriptions: string[];
  note?: string | null;
};

type ClubEvolutionPeriodKey = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

type ClubEvolutionChartPointV1 = {
  item: ClubValueHistorySnapshot;
  key: string;
  x: number;
  y: number;
  dateMs: number | null;
  index: number;
};

type ClubEvolutionChartSegmentV1 = {
  previous: ClubEvolutionChartPointV1;
  next: ClubEvolutionChartPointV1;
};

type ClubEvolutionChartGapSegmentV1 = ClubEvolutionChartSegmentV1 & {
  id: string;
  x: number;
  label: string;
};

const XS_CLUB_EVOLUTION_PERIODS_V1: Array<{ key: ClubEvolutionPeriodKey; label: string; days: number | null }> = [
  { key: "7d", label: "7J", days: 7 },
  { key: "30d", label: "30J", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "1y", label: "1A", days: 365 },
  { key: "all", label: "TOUT", days: null },
];

const XS_CLUB_EVOLUTION_MAX_CHART_SNAPSHOTS_V1 = 90;
const XS_CLUB_EVOLUTION_GRAPH_GAP_DAYS_V1 = 14;

function normalizeBackendHistoryItemV1(item: any): ClubValueHistorySnapshot {
  return {
    id: String(item?.id || item?.snapshotDate || item?.createdAt || ""),
    label: String(item?.gameWeekLabel || item?.label || ""),
    createdAt: String(item?.snapshotDate || item?.createdAt || ""),
    clubValueEur: metricNumber(item?.clubValueEur) ?? 0,
    clubValueText: String(item?.clubValueText || ""),
    pricedCards: metricNumber(item?.pricedCards),
    unpricedCards: metricNumber(item?.unpricedCards ?? item?.unpriced_cards),
    cardCount: metricNumber(item?.cardCount),
    coveragePct: metricNumber(item?.coveragePct ?? item?.coverage_pct),
    source: item?.source ? String(item.source) : null,
    totalInvestedEur: metricNumber(item?.totalInvestedEur ?? item?.cashSpentEur),
    totalSoldEur: metricNumber(item?.totalSoldEur ?? item?.cashReceivedEur),
    estimatedProfitEur: metricNumber(item?.estimatedProfitEur ?? item?.profitLossEur),
    estimatedProfitPct: metricNumber(item?.estimatedProfitPct),
    bestCardSlug: item?.bestCardSlug ? String(item.bestCardSlug) : null,
    bestCardGainEur: metricNumber(item?.bestCardGainEur),
    worstCardSlug: item?.worstCardSlug ? String(item.worstCardSlug) : null,
    worstCardGainEur: metricNumber(item?.worstCardGainEur),
  };
}

async function readDeviceIdV1(): Promise<string | null> {
  const oauthId = (await AsyncStorage.getItem(OAUTH_DEVICE_ID_KEY)) || "";
  if (oauthId.trim()) return oauthId.trim();
  const jwtId = (await AsyncStorage.getItem(JWT_DEVICE_ID_KEY)) || "";
  if (jwtId.trim()) return jwtId.trim();
  const existing = (await AsyncStorage.getItem(DEVICE_ID_KEY)) || "";
  return existing.trim() || null;
}

function metricNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatEuro(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function formatSignedEuro(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("fr-FR")} €`;
}

function formatPreciseEuroV1(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  const hasCents = Math.abs(rounded - Math.round(rounded)) > 0.001;
  return `${rounded.toLocaleString("fr-FR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })} €`;
}

function formatSignedPreciseEuroV1(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatPreciseEuroV1(Math.abs(value))}`;
}

function formatSnapshotDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function xsClubEvolutionSnapshotDateV1(item: ClubValueHistorySnapshot): Date | null {
  const date = new Date(item.createdAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function xsClubEvolutionHasRepeatedDayV1(history: ClubValueHistorySnapshot[]): boolean {
  const counts = new Map<string, number>();
  history.forEach((item) => {
    const date = xsClubEvolutionSnapshotDateV1(item);
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.values()).some((count) => count > 1);
}

function xsClubEvolutionDateLabelV1(item: ClubValueHistorySnapshot, includeTime: boolean): string {
  const date = xsClubEvolutionSnapshotDateV1(item);
  if (!date) return "—";
  const datePart = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  if (!includeTime) return datePart;
  const timePart = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

function xsClubEvolutionFullDateLabelV1(item: ClubValueHistorySnapshot): string {
  const date = xsClubEvolutionSnapshotDateV1(item);
  if (!date) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function xsClubEvolutionSecondaryLabelV1(item: ClubValueHistorySnapshot): string | null {
  if (!item.label || /^session\s+\d+$/i.test(item.label)) return null;
  return item.label;
}

function xsClubEvolutionSnapshotKeyV1(item: ClubValueHistorySnapshot): string {
  return `${item.id || "snapshot"}-${item.createdAt || "no-date"}-${item.clubValueEur}`;
}

function xsClubEvolutionDateTimeLabelV1(item: ClubValueHistorySnapshot): string {
  const date = xsClubEvolutionSnapshotDateV1(item);
  if (!date) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function xsClubEvolutionSourceLabelV1(source?: string | null): string {
  if (source === "manual_session_backfill") return "Historique reconstruit de session";
  if (source === "manual_snapshot") return "Snapshot manuel";
  if (source === "auto_snapshot") return "Snapshot automatique";
  if (source === "local_snapshot") return "Snapshot local";
  return "Snapshot de valeur";
}

function xsClubEvolutionFiniteMetricV1(value?: number | null): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
}

function xsClubEvolutionSnapshotCompleteV1(item: ClubValueHistorySnapshot): boolean {
  const unpricedCards = xsClubEvolutionFiniteMetricV1(item.unpricedCards);
  if (unpricedCards !== null) return unpricedCards <= 0;

  const pricedCards = xsClubEvolutionFiniteMetricV1(item.pricedCards);
  const cardCount = xsClubEvolutionFiniteMetricV1(item.cardCount);
  if (pricedCards !== null && cardCount !== null && cardCount > 0) return pricedCards >= cardCount;

  const coveragePct = xsClubEvolutionFiniteMetricV1(item.coveragePct);
  if (coveragePct !== null) return coveragePct >= 100;

  return false;
}

function xsClubEvolutionCompleteValueHistoryV1(history: ClubValueHistorySnapshot[]): ClubValueHistorySnapshot[] {
  return xsClubEvolutionChartHistoryV1(history).filter(xsClubEvolutionSnapshotCompleteV1);
}

function xsClubEvolutionIncompleteInitializationCountV1(
  history: ClubValueHistorySnapshot[],
  completeHistory: ClubValueHistorySnapshot[]
): number {
  const firstComplete = completeHistory[0];
  const firstCompleteDate = firstComplete ? xsClubEvolutionSnapshotDateV1(firstComplete) : null;
  if (!firstCompleteDate) return 0;
  const firstCompleteTime = firstCompleteDate.getTime();
  return history.filter((item) => {
    const date = xsClubEvolutionSnapshotDateV1(item);
    return !!date && date.getTime() < firstCompleteTime && !xsClubEvolutionSnapshotCompleteV1(item);
  }).length;
}

function xsClubEvolutionFilterHistoryByPeriodV1(
  history: ClubValueHistorySnapshot[],
  periodKey: ClubEvolutionPeriodKey,
  events: ClubFinancialTimelineEvent[] = []
): { items: ClubValueHistorySnapshot[]; fallbackUsed: boolean; noSnapshotsInRange: boolean; sameAsFullRange: boolean } {
  if (!history.length || periodKey === "all") {
    return { items: history, fallbackUsed: false, noSnapshotsInRange: false, sameAsFullRange: periodKey !== "all" && history.length > 0 };
  }
  const period = XS_CLUB_EVOLUTION_PERIODS_V1.find((item) => item.key === periodKey);
  if (!period?.days) return { items: history, fallbackUsed: false, noSnapshotsInRange: false, sameAsFullRange: false };

  const cutoff = xsClubEvolutionPeriodCutoffV1(history, [], periodKey);
  if (!cutoff) return { items: history, fallbackUsed: false, noSnapshotsInRange: false, sameAsFullRange: false };

  const filtered = history.filter((item) => {
    const date = xsClubEvolutionSnapshotDateV1(item);
    return !!date && date.getTime() >= cutoff.getTime();
  });

  if (filtered.length) {
    return {
      items: filtered,
      fallbackUsed: false,
      noSnapshotsInRange: false,
      sameAsFullRange: filtered.length === history.length,
    };
  }
  if (events.some((event) => event.dateMs >= cutoff.getTime())) {
    return { items: [], fallbackUsed: false, noSnapshotsInRange: true, sameAsFullRange: false };
  }
  return { items: [], fallbackUsed: false, noSnapshotsInRange: false, sameAsFullRange: false };
}

function xsClubEvolutionDateFromStringV1(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function xsClubEvolutionTimelineDateLabelV1(value: string): string {
  const date = xsClubEvolutionDateFromStringV1(value);
  if (!date) return "—";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function xsClubEvolutionPeriodCutoffV1(
  history: ClubValueHistorySnapshot[],
  events: ClubFinancialTimelineEvent[],
  periodKey: ClubEvolutionPeriodKey
): Date | null {
  if (periodKey === "all") return null;
  const period = XS_CLUB_EVOLUTION_PERIODS_V1.find((item) => item.key === periodKey);
  if (!period?.days) return null;
  const snapshotTimes = history
    .map(xsClubEvolutionSnapshotDateV1)
    .filter((date): date is Date => !!date)
    .map((date) => date.getTime());
  const eventTimes = events.map((event) => event.dateMs).filter((time) => Number.isFinite(time));
  const allTimes = snapshotTimes.concat(eventTimes).sort((a, b) => a - b);
  const anchor = allTimes[allTimes.length - 1];
  if (!Number.isFinite(anchor)) return null;
  return new Date(anchor - period.days * 24 * 60 * 60 * 1000);
}

function xsClubEvolutionFilterFinancialEventsByPeriodV1(
  events: ClubFinancialTimelineEvent[],
  history: ClubValueHistorySnapshot[],
  periodKey: ClubEvolutionPeriodKey
): ClubFinancialTimelineEvent[] {
  const cutoff = xsClubEvolutionPeriodCutoffV1(history, events, periodKey);
  const filtered = cutoff
    ? events.filter((event) => event.dateMs >= cutoff.getTime())
    : events;
  return filtered.slice().sort((a, b) => b.dateMs - a.dateMs);
}

function buildEvolutionEvents(history: ClubValueHistorySnapshot[]): ClubEvolutionValueEvent[] {
  const events: ClubEvolutionValueEvent[] = [];
  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1];
    const current = history[index];
    const roundedDelta = Math.round(current.clubValueEur - previous.clubValueEur);
    const previousPriced = previous.pricedCards ?? null;
    const currentPriced = current.pricedCards ?? null;
    const previousCoverage = previous.coveragePct ?? null;
    const currentCoverage = current.coveragePct ?? null;
    const deltaPricedCards = previousPriced !== null && currentPriced !== null ? currentPriced - previousPriced : null;
    const deltaCoverage = previousCoverage !== null && currentCoverage !== null ? Math.round(currentCoverage - previousCoverage) : null;
    const descriptions: string[] = [];

    if (deltaPricedCards !== null && deltaPricedCards > 0) {
      const plural = deltaPricedCards > 1 ? "s" : "";
      descriptions.push(`${deltaPricedCards} nouvelle${plural} carte${plural} valorisée${plural}`);
    }
    if (roundedDelta > 0) descriptions.push(`Valeur club en hausse de ${formatSignedEuro(roundedDelta)}`);
    if (roundedDelta < 0) descriptions.push(`Valeur club en baisse de ${formatSignedEuro(roundedDelta)}`);
    if (deltaCoverage !== null && deltaCoverage > 0) descriptions.push(`Couverture marché améliorée de +${deltaCoverage} %`);

    const note = current.source === "manual_session_backfill" ? "Historique reconstruit de session" : null;
    if (!descriptions.length && !note) continue;
    events.push({
      id: `${current.id || current.createdAt}-${index}`,
      dateLabel: xsClubEvolutionDateLabelV1(current, true),
      deltaValue: roundedDelta,
      deltaText: formatSignedEuro(roundedDelta),
      descriptions,
      note,
    });
  }
  return events;
}

function xsClubEvolutionEventsForSelectedPointV1(
  history: ClubValueHistorySnapshot[],
  selected: ClubValueHistorySnapshot | null
): ClubEvolutionValueEvent[] {
  if (!selected) return [];
  const selectedKey = xsClubEvolutionSnapshotKeyV1(selected);
  const index = history.findIndex((item) => xsClubEvolutionSnapshotKeyV1(item) === selectedKey);
  if (index <= 0) return [];
  return buildEvolutionEvents(history.slice(index - 1, index + 1));
}

function xsClubEvolutionDeltaForSelectedPointV1(
  history: ClubValueHistorySnapshot[],
  selected: ClubValueHistorySnapshot | null
): number | null {
  if (!selected) return null;
  const selectedKey = xsClubEvolutionSnapshotKeyV1(selected);
  const index = history.findIndex((item) => xsClubEvolutionSnapshotKeyV1(item) === selectedKey);
  if (index <= 0) return null;
  return selected.clubValueEur - history[index - 1].clubValueEur;
}

function xsClubEvolutionAxisLabelIndexesV1(length: number): Set<number> {
  if (length <= 4) return new Set(Array.from({ length }, (_, index) => index));
  return new Set([0, Math.floor((length - 1) / 2), length - 1]);
}

function xsClampFinancialChartV1(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function xsClubEvolutionChartHistoryV1(history: ClubValueHistorySnapshot[]): ClubValueHistorySnapshot[] {
  const clean = history
    .map((item, index) => ({
      item,
      index,
      date: xsClubEvolutionSnapshotDateV1(item),
      value: metricNumber(item.clubValueEur),
    }))
    .filter(({ value }) => value !== null && Number.isFinite(value))
    .sort((a, b) => {
      const aTime = a.date?.getTime();
      const bTime = b.date?.getTime();
      const aHasDate = Number.isFinite(aTime);
      const bHasDate = Number.isFinite(bTime);
      if (aHasDate && bHasDate && aTime !== bTime) return (aTime as number) - (bTime as number);
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);

  if (clean.length <= XS_CLUB_EVOLUTION_MAX_CHART_SNAPSHOTS_V1) return clean;

  const first = clean[0];
  const last = clean[clean.length - 1];
  const firstDate = xsClubEvolutionSnapshotDateV1(first);
  const lastDate = xsClubEvolutionSnapshotDateV1(last);
  const timeSpan = firstDate && lastDate ? lastDate.getTime() - firstDate.getTime() : 0;
  if (!firstDate || !lastDate || timeSpan <= 0) {
    const step = Math.ceil(clean.length / XS_CLUB_EVOLUTION_MAX_CHART_SNAPSHOTS_V1);
    return clean.filter((_, index) => index === 0 || index === clean.length - 1 || index % step === 0);
  }

  const bucketMs = timeSpan / Math.max(1, XS_CLUB_EVOLUTION_MAX_CHART_SNAPSHOTS_V1 - 2);
  const bucketed = new Map<number, ClubValueHistorySnapshot>();
  const significant = new Set<string>();
  clean.slice(1, -1).forEach((item, index) => {
    const date = xsClubEvolutionSnapshotDateV1(item);
    if (!date) return;
    const bucket = Math.floor((date.getTime() - firstDate.getTime()) / Math.max(1, bucketMs));
    bucketed.set(bucket, item);
    const previous = clean[index];
    const previousValue = previous?.clubValueEur ?? item.clubValueEur;
    const delta = Math.abs(item.clubValueEur - previousValue);
    const base = Math.max(1, Math.abs(previousValue));
    if (delta >= 5 || delta / base >= 0.03) significant.add(xsClubEvolutionSnapshotKeyV1(item));
  });

  const merged = [first]
    .concat(Array.from(bucketed.values()))
    .concat(clean.filter((item) => significant.has(xsClubEvolutionSnapshotKeyV1(item))))
    .concat(last);
  const byKey = new Map<string, ClubValueHistorySnapshot>();
  merged.forEach((item) => byKey.set(xsClubEvolutionSnapshotKeyV1(item), item));
  return Array.from(byKey.values()).sort((a, b) => {
    const aTime = xsClubEvolutionSnapshotDateV1(a)?.getTime() ?? 0;
    const bTime = xsClubEvolutionSnapshotDateV1(b)?.getTime() ?? 0;
    return aTime - bTime;
  });
}

function xsClubEvolutionBuildChartPointsV1(
  history: ClubValueHistorySnapshot[],
  plotWidth: number,
  plotHeight: number,
  pad: number
): { points: ClubEvolutionChartPointV1[]; min: number; max: number; minTime: number; maxTime: number } {
  const values = history.map((item) => item.clubValueEur).filter((value) => Number.isFinite(value));
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values, 1) : 1;
  const rawRange = rawMax - rawMin;
  const padding = rawRange > 0
    ? xsClampFinancialChartV1(rawRange * 0.08, 0.5, 5)
    : Math.max(1, Math.abs(rawMin) * 0.01);
  const min = Math.max(0, rawMin - padding);
  const max = rawMax + padding;
  const valueRange = Math.max(1, max - min);
  const dated = history.map((item) => xsClubEvolutionSnapshotDateV1(item)?.getTime() ?? null);
  const validTimes = dated.filter((time): time is number => Number.isFinite(time));
  const minTime = validTimes.length ? Math.min(...validTimes) : 0;
  const maxTime = validTimes.length ? Math.max(...validTimes) : minTime;
  const xPad = xsClampFinancialChartV1(plotWidth * 0.055, 18, 24);
  const xMin = xPad;
  const xMax = Math.max(xPad, plotWidth - xPad);
  const innerWidth = Math.max(1, xMax - xMin);

  const points = history.map((item, index) => {
    const dateMs = dated[index];
    const rawX = history.length <= 1 ? plotWidth / 2 : xMin + (innerWidth / (history.length - 1)) * index;
    const y = rawRange <= 0
      ? plotHeight / 2
      : pad + (1 - ((item.clubValueEur - min) / valueRange)) * (plotHeight - pad * 2);
    return {
      item,
      key: xsClubEvolutionSnapshotKeyV1(item),
      x: xsClampFinancialChartV1(rawX, xMin, xMax),
      y: xsClampFinancialChartV1(y, pad, plotHeight - pad),
      dateMs,
      index,
    };
  });

  return { points, min, max, minTime, maxTime };
}

function xsClubEvolutionEventXForBalancedChartV1(
  eventMs: number,
  points: ClubEvolutionChartPointV1[]
): number | null {
  const datedPoints = points
    .filter((point) => point.dateMs !== null && Number.isFinite(point.dateMs))
    .sort((a, b) => (a.dateMs as number) - (b.dateMs as number));
  if (!datedPoints.length || !Number.isFinite(eventMs)) return null;
  const first = datedPoints[0];
  const last = datedPoints[datedPoints.length - 1];
  if (eventMs <= (first.dateMs as number)) return first.x;
  if (eventMs >= (last.dateMs as number)) return last.x;

  for (let index = 1; index < datedPoints.length; index += 1) {
    const previous = datedPoints[index - 1];
    const next = datedPoints[index];
    const previousTime = previous.dateMs as number;
    const nextTime = next.dateMs as number;
    if (eventMs <= nextTime) {
      const ratio = nextTime === previousTime
        ? 0
        : xsClampFinancialChartV1((eventMs - previousTime) / Math.max(1, nextTime - previousTime), 0, 1);
      return previous.x + (next.x - previous.x) * ratio;
    }
  }
  return last.x;
}

function xsClubEvolutionNearestChartPointV1(points: ClubEvolutionChartPointV1[], x: number): ClubEvolutionChartPointV1 | null {
  if (!points.length || !Number.isFinite(x)) return null;
  return points.reduce((best, point) => (Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best), points[0]);
}

function xsClubEvolutionShouldConnectChartPointsV1(previous: ClubEvolutionChartPointV1, next: ClubEvolutionChartPointV1): boolean {
  if (!previous.dateMs || !next.dateMs) return true;
  const gapMs = Math.abs(next.dateMs - previous.dateMs);
  return gapMs <= XS_CLUB_EVOLUTION_GRAPH_GAP_DAYS_V1 * 24 * 60 * 60 * 1000;
}

function xsClubEvolutionConnectedSegmentsV1(points: ClubEvolutionChartPointV1[]): ClubEvolutionChartSegmentV1[] {
  const segments: ClubEvolutionChartSegmentV1[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (xsClubEvolutionShouldConnectChartPointsV1(previous, next)) segments.push({ previous, next });
  }
  return segments;
}

function xsClubEvolutionGapSegmentsV1(points: ClubEvolutionChartPointV1[]): ClubEvolutionChartGapSegmentV1[] {
  const gaps: ClubEvolutionChartGapSegmentV1[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (!xsClubEvolutionShouldConnectChartPointsV1(previous, next)) {
      const gapDays = previous.dateMs && next.dateMs
        ? Math.max(1, Math.round(Math.abs(next.dateMs - previous.dateMs) / (24 * 60 * 60 * 1000)))
        : null;
      gaps.push({
        id: `${previous.key}-${next.key}`,
        previous,
        next,
        x: (previous.x + next.x) / 2,
        label: gapDays ? `${gapDays} j` : "Pause",
      });
    }
  }
  return gaps;
}

function xsClubEvolutionSegmentGeometryV1(previous: ClubEvolutionChartPointV1, next: ClubEvolutionChartPointV1) {
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return {
    length,
    left: (previous.x + next.x) / 2 - length / 2,
    top: (previous.y + next.y) / 2,
    angle: `${Math.atan2(dy, dx)}rad`,
  };
}

async function xsEvolutionAuditFetchJsonV1<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${XS_HOME_AUDIT_FIX_CLOUD_BASE_V1}${path.startsWith("/") ? "" : "/"}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const msg = typeof data === "string" ? data : (data?.error || data?.message || `HTTP ${response.status}`);
    throw new Error(msg);
  }
  return data as T;
}

async function xsEvolutionAuditClubFetchV1<T>(
  path: string,
  options: RequestInit = {},
  isUsable: (payload: any) => boolean = (payload) => !!payload && payload.ok !== false
): Promise<T> {
  let primary: any = null;
  try {
    primary = await apiFetch<T>(path, options);
    if (isUsable(primary)) return primary as T;
  } catch {}
  try {
    const cloud = await xsEvolutionAuditFetchJsonV1<T>(path, options);
    if (isUsable(cloud)) return cloud;
  } catch {}
  if (primary !== null) return primary as T;
  throw new Error("club_endpoint_unavailable");
}

function xsEvolutionHistoryPayloadUsableV1(payload: any): boolean {
  return payload && payload.ok !== false && Array.isArray(payload.items) && payload.items.length > 1;
}

async function readHistoryV1(): Promise<ClubValueHistorySnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(CLUB_VALUE_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((item: any) => ({
            id: String(item?.id || item?.createdAt || ""),
            label: String(item?.label || ""),
            createdAt: String(item?.createdAt || ""),
            clubValueEur: metricNumber(item?.clubValueEur) ?? 0,
            clubValueText: String(item?.clubValueText || ""),
            pricedCards: metricNumber(item?.pricedCards),
            unpricedCards: metricNumber(item?.unpricedCards),
            cardCount: metricNumber(item?.cardCount),
            coveragePct: metricNumber(item?.coveragePct),
            source: item?.source ? String(item.source) : null,
            totalInvestedEur: metricNumber(item?.totalInvestedEur),
            totalSoldEur: metricNumber(item?.totalSoldEur),
            estimatedProfitEur: metricNumber(item?.estimatedProfitEur),
            estimatedProfitPct: metricNumber(item?.estimatedProfitPct),
            bestCardSlug: item?.bestCardSlug ? String(item.bestCardSlug) : null,
            bestCardGainEur: metricNumber(item?.bestCardGainEur),
            worstCardSlug: item?.worstCardSlug ? String(item.worstCardSlug) : null,
            worstCardGainEur: metricNumber(item?.worstCardGainEur),
          }))
          .filter((item) => item.createdAt && Number.isFinite(item.clubValueEur))
      : [];
  } catch {
    return [];
  }
}

async function upsertCurrentSnapshotV1(): Promise<ClubValueHistorySnapshot[]> {
  const deviceId = await readDeviceIdV1();
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  const payload = await xsEvolutionAuditClubFetchV1<any>(
    `/club/value-detail${qs.toString() ? `?${qs.toString()}` : ""}`,
    {},
    (value) => value && value.ok !== false && metricNumber(value.clubValueEur) !== null
  );
  const value = metricNumber(payload?.clubValueEur);
  const current = await readHistoryV1();
  if (value === null) return current;
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const last = current[current.length - 1];
  const next: ClubValueHistorySnapshot = {
    id: dayKey,
    label: `GW${current.length + 521}`,
    createdAt: today.toISOString(),
    clubValueEur: Math.round(value * 100) / 100,
    clubValueText: typeof payload?.clubValueText === "string" ? payload.clubValueText : formatEuro(value),
    pricedCards: metricNumber(payload?.pricedCards),
    unpricedCards: metricNumber(payload?.unpricedCards),
    cardCount: metricNumber(payload?.cardCount),
    coveragePct: metricNumber(payload?.coveragePct),
    source: "local_snapshot",
    totalInvestedEur: metricNumber(payload?.totalInvestedEur),
    totalSoldEur: metricNumber(payload?.totalSoldEur),
    estimatedProfitEur: metricNumber(payload?.estimatedProfitEur),
    estimatedProfitPct: metricNumber(payload?.estimatedProfitPct),
    bestCardSlug: payload?.bestCardSlug ? String(payload.bestCardSlug) : null,
    bestCardGainEur: metricNumber(payload?.bestCardGainEur),
    worstCardSlug: payload?.worstCardSlug ? String(payload.worstCardSlug) : null,
    worstCardGainEur: metricNumber(payload?.worstCardGainEur),
  };
  const merged = last && last.id === dayKey
    ? [...current.slice(0, -1), { ...last, ...next, label: last.label || next.label }]
    : current.length && Math.abs((last?.clubValueEur ?? 0) - next.clubValueEur) < 0.01
      ? current
      : [...current, next];
  const trimmed = merged.slice(-120);
  await AsyncStorage.setItem(CLUB_VALUE_HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

async function readBackendHistoryV1(deviceId: string | null): Promise<ClubValueHistorySnapshot[]> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  const payload = await xsEvolutionAuditClubFetchV1<any>(
    `/club/value-history${qs.toString() ? `?${qs.toString()}` : ""}`,
    {},
    xsEvolutionHistoryPayloadUsableV1
  );
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map(normalizeBackendHistoryItemV1)
    .filter((item) => item.createdAt && Number.isFinite(item.clubValueEur));
}

async function createBackendSnapshotV1(deviceId: string | null): Promise<void> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  await xsEvolutionAuditClubFetchV1<any>(`/club/value-history/snapshot${qs.toString() ? `?${qs.toString()}` : ""}`, { method: "POST" });
}

async function readRewardEventsV1(deviceId: string | null): Promise<ClubRewardHistoryItem[]> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  qs.set("limit", "200");
  const payload = await xsEvolutionAuditClubFetchV1<any>(`/club/rewards-history${qs.toString() ? `?${qs.toString()}` : ""}`);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => ({
    id: item?.id ? String(item.id) : null,
    gameWeekLabel: item?.gameWeekLabel ? String(item.gameWeekLabel) : null,
    competition: item?.competition ? String(item.competition) : null,
    division: item?.division ? String(item.division) : null,
    rewardType: item?.rewardType ? String(item.rewardType) : null,
    rewardTotalEur: metricNumber(item?.rewardTotalEur),
    rewardTotalText: item?.rewardTotalText ? String(item.rewardTotalText) : null,
    rewardCashText: item?.rewardCashText ? String(item.rewardCashText) : null,
    rewardEthText: item?.rewardEthText ? String(item.rewardEthText) : null,
    rewardCardPlayerName: item?.rewardCardPlayerName ? String(item.rewardCardPlayerName) : null,
    rewardCardValueText: item?.rewardCardValueText ? String(item.rewardCardValueText) : null,
    createdAt: item?.createdAt ? String(item.createdAt) : null,
  }));
}

async function readTransactionEventsV1(deviceId: string | null): Promise<ClubTransactionHistoryItem[]> {
  const qs = new URLSearchParams();
  if (deviceId) qs.set("deviceId", deviceId);
  qs.set("limit", "200");
  const payload = await xsEvolutionAuditClubFetchV1<any>(`/club/transactions-history?${qs.toString()}`);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item: any) => ({
    id: item?.id ? String(item.id) : null,
    transactionType: item?.transactionType ? String(item.transactionType) : null,
    playerName: item?.playerName ? String(item.playerName) : null,
    cardSlug: item?.cardSlug ? String(item.cardSlug) : null,
    amountEur: metricNumber(item?.amountEur),
    amountText: item?.amountText ? String(item.amountText) : null,
    transactionDate: item?.transactionDate ? String(item.transactionDate) : null,
  }));
}

function ChartLine({
  history,
  financialEvents,
  selectedKey,
  onSelect,
}: {
  history: ClubValueHistorySnapshot[];
  financialEvents: ClubFinancialTimelineEvent[];
  selectedKey: string | null;
  onSelect: (item: ClubValueHistorySnapshot) => void;
}) {
  const [measuredWidth, setMeasuredWidth] = useState(320);
  const chartHistory = useMemo(() => xsClubEvolutionChartHistoryV1(history), [history]);
  const includeTime = xsClubEvolutionHasRepeatedDayV1(chartHistory);
  const labelIndexes = xsClubEvolutionAxisLabelIndexesV1(chartHistory.length);
  const plotWidth = Math.max(260, measuredWidth);
  const plotHeight = 220;
  const pad = 30;
  const { points, min, max, minTime, maxTime } = useMemo(
    () => xsClubEvolutionBuildChartPointsV1(chartHistory, plotWidth, plotHeight, pad),
    [chartHistory, plotWidth]
  );
  const mid = (min + max) / 2;
  const connectedSegments = useMemo(() => xsClubEvolutionConnectedSegmentsV1(points), [points]);
  const gapSegments = useMemo(() => xsClubEvolutionGapSegmentsV1(points), [points]);
  const selectedIndexFromKey = selectedKey
    ? points.findIndex((point) => point.key === selectedKey)
    : -1;
  const selectedIndex = selectedIndexFromKey >= 0 ? selectedIndexFromKey : Math.max(0, points.length - 1);
  const selected = points[selectedIndex] || points[points.length - 1] || null;
  const axisLabelPoints = Array.from(labelIndexes)
    .sort((a, b) => a - b)
    .map((index) => points[index])
    .filter((point): point is ClubEvolutionChartPointV1 => !!point);
  const financialDots = financialEvents
    .filter((event) => {
      if (!Number.isFinite(event.dateMs)) return false;
      if (!points.length || minTime === maxTime) return true;
      return event.dateMs >= minTime && event.dateMs <= maxTime;
    })
    .slice(0, 40)
    .map((event, index) => {
      const x = xsClubEvolutionEventXForBalancedChartV1(event.dateMs, points)
        ?? points[index % Math.max(1, points.length)]?.x
        ?? plotWidth / 2;
      return {
        event,
        index,
        x: xsClampFinancialChartV1(x, 0, plotWidth),
        lane: index % 3,
      };
    });
  const onPlotLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    if (width > 0 && Math.abs(width - measuredWidth) > 2) setMeasuredWidth(width);
  }, [measuredWidth]);
  const selectNearestPoint = useCallback((x: number) => {
    const point = xsClubEvolutionNearestChartPointV1(points, x);
    if (point) onSelect(point.item);
  }, [onSelect, points]);
  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
      onPanResponderGrant: (event) => selectNearestPoint(event.nativeEvent.locationX),
      onPanResponderMove: (event) => selectNearestPoint(event.nativeEvent.locationX),
      onPanResponderTerminationRequest: () => true,
    }),
    [selectNearestPoint]
  );

  if (!points.length) {
    return (
      <View style={styles.chart}>
        <View style={styles.loadingBox}>
          <Text style={styles.muted}>Aucune valeur exploitable pour la courbe.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chart}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,49,72,0.12)", "rgba(255,49,72,0.035)", "rgba(0,0,0,0.02)"]}
        locations={[0, 0.44, 1]}
        style={styles.chartBackdrop}
      />
      <View style={styles.chartGrid} />
      <View style={styles.lineHeader}>
        <View>
          <Text style={styles.chartValueLarge}>{selected ? (selected.item.clubValueText || formatEuro(selected.item.clubValueEur)) : "—"}</Text>
          <Text style={styles.chartLabel}>{selected ? xsClubEvolutionDateLabelV1(selected.item, true) : "—"}</Text>
        </View>
        <View style={styles.chartMetaPill}>
          <Text style={styles.chartMetaText}>Valeur du club</Text>
          <Text style={styles.chartMetaSubText}>Min {formatEuro(min)} · Max {formatEuro(max)}</Text>
        </View>
      </View>
      <View style={styles.linePlotOuter} onLayout={onPlotLayout}>
        <View style={[styles.linePlot, { height: plotHeight }]} {...panResponder.panHandlers}>
          <View pointerEvents="none" style={styles.chartGlow} />
          <View pointerEvents="none" style={[styles.chartHorizontalLine, { top: pad }]} />
          <View pointerEvents="none" style={[styles.chartHorizontalLine, styles.chartHorizontalLineSoft, { top: plotHeight / 2 }]} />
          <View pointerEvents="none" style={[styles.chartHorizontalLine, { top: plotHeight - pad }]} />
          <Text pointerEvents="none" style={[styles.chartAxisValue, { top: pad - 12 }]}>{formatEuro(max)}</Text>
          <Text pointerEvents="none" style={[styles.chartAxisValue, styles.chartAxisValueMuted, { top: plotHeight / 2 - 9 }]}>{formatEuro(mid)}</Text>
          <Text pointerEvents="none" style={[styles.chartAxisValue, { top: plotHeight - pad - 6 }]}>{formatEuro(min)}</Text>
          {connectedSegments.map(({ previous, next }, index) => {
            const width = Math.max(2, next.x - previous.x + 2);
            const height = Math.max(1, plotHeight - pad - Math.min(previous.y, next.y));
            return (
              <LinearGradient
                key={`area-${index}-${previous.key}-${next.key}`}
                pointerEvents="none"
                colors={["rgba(255,49,72,0.18)", "rgba(255,49,72,0.055)", "rgba(255,49,72,0)"]}
                locations={[0, 0.52, 1]}
                style={[
                  styles.chartAreaColumn,
                  {
                    left: previous.x,
                    top: Math.min(previous.y, next.y),
                    width,
                    height,
                  },
                ]}
              />
            );
          })}
          {connectedSegments.map(({ previous, next }, index) => {
            const segment = xsClubEvolutionSegmentGeometryV1(previous, next);
            if (segment.length < 0.5) return null;
            return (
              <LinearGradient
                key={`curve-segment-${index}-${previous.key}-${next.key}`}
                pointerEvents="none"
                colors={["#FF6273", "#FF223D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.chartCurveSegment,
                  {
                    left: segment.left,
                    top: segment.top - 1.4,
                    width: segment.length,
                    transform: [{ rotate: segment.angle }],
                  },
                ]}
              />
            );
          })}
          {gapSegments.map((gap) => {
            const segment = xsClubEvolutionSegmentGeometryV1(gap.previous, gap.next);
            if (segment.length < 0.5) return null;
            return (
              <View
                key={`gap-line-${gap.id}`}
                pointerEvents="none"
                style={[
                  styles.chartGapSegment,
                  {
                    left: segment.left,
                    top: segment.top - 1,
                    width: segment.length,
                    transform: [{ rotate: segment.angle }],
                  },
                ]}
              />
            );
          })}
          {gapSegments.map((gap) => (
            <View key={`gap-${gap.id}`} pointerEvents="none" style={[styles.chartGapMarker, { left: gap.x - 22 }]}>
              <Text style={styles.chartGapText}>{gap.label}</Text>
            </View>
          ))}
          {selected ? <View pointerEvents="none" style={[styles.chartCursor, { left: selected.x }]} /> : null}
          {financialDots.map(({ event, index, x, lane }) => (
            <View
              key={`financial-dot-${event.id}-${index}`}
              pointerEvents="none"
              style={[
                styles.financialDot,
                event.kind === "buy" ? styles.financialDotBuy : event.kind === "sell" ? styles.financialDotSell : styles.financialDotReward,
                { left: x - 3, top: plotHeight - 24 - lane * 9 },
              ]}
            />
          ))}
          {points.map((point, index) => (
            <Pressable
              key={`point-${point.item.id}-${index}`}
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => onSelect(point.item)}
              style={[
                styles.linePoint,
                index === selectedIndex && styles.linePointSelected,
                { left: point.x - 4, top: point.y - 4 },
              ]}
            />
          ))}
        </View>
        <View style={[styles.lineLabels, { height: 24 }]}>
          {axisLabelPoints.map((point, index) => (
            <Text
              key={`label-${point.item.id}-${index}`}
              style={[styles.chartLabel, styles.chartAxisLabel, { left: xsClampFinancialChartV1(point.x - 40, 0, Math.max(0, plotWidth - 80)) }]}
              numberOfLines={1}
            >
              {xsClubEvolutionDateLabelV1(point.item, includeTime)}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function formatSlugLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rewardEventTitleV1(item: ClubRewardHistoryItem): string {
  if (item.gameWeekLabel) return item.gameWeekLabel;
  if (item.competition) return item.competition;
  if (item.rewardType === "TokenMonetaryReward" || item.rewardType === "REWARD") return "Récompense Sorare";
  if (item.rewardType) return "Récompense Sorare";
  return "Récompense Sorare";
}

function rewardEventValueV1(item: ClubRewardHistoryItem): string {
  if (item.rewardTotalEur !== null && item.rewardTotalEur !== undefined) return formatPreciseEuroV1(item.rewardTotalEur);
  if (item.rewardTotalText && item.rewardTotalText !== "À connecter") return item.rewardTotalText;
  if (item.rewardCardPlayerName) return `Carte gagnée : ${item.rewardCardPlayerName}`;
  if (item.rewardCashText && item.rewardCashText !== "À connecter") return item.rewardCashText;
  if (item.rewardEthText && item.rewardEthText !== "À connecter") return item.rewardEthText;
  return "À connecter";
}

function transactionEventTitleV1(item: ClubTransactionHistoryItem): string {
  const name = item.playerName || item.cardSlug || "Carte Sorare";
  if (item.transactionType === "sell") return `Vente ${name}`;
  if (item.transactionType === "buy") return `Achat ${name}`;
  return `Mouvement Sorare ${name}`;
}

function transactionEventValueV1(item: ClubTransactionHistoryItem): string {
  if (item.amountEur !== null && item.amountEur !== undefined) {
    const sign = item.transactionType === "sell" ? 1 : item.transactionType === "buy" ? -1 : 0;
    return sign ? formatSignedPreciseEuroV1(sign * item.amountEur) : formatPreciseEuroV1(item.amountEur);
  }
  const value = item.amountText || "À connecter";
  if (value === "À connecter") return value;
  return item.transactionType === "sell" ? `+${value}` : `-${value}`;
}

function xsClubEvolutionFinancialEventDetailV1(event: ClubFinancialTimelineEvent): string {
  if (event.kind === "buy") return event.count && event.count > 1 ? `${event.count} achats Sorare regroupés` : "Achat Sorare";
  if (event.kind === "sell") return event.count && event.count > 1 ? `${event.count} ventes Sorare regroupées` : "Vente Sorare";
  if (event.kind === "reward") return event.count && event.count > 1 ? `${event.count} récompenses Sorare regroupées` : "Récompense Sorare";
  return event.detail;
}

function xsClubEvolutionGroupTimelineEventsV1(events: ClubFinancialTimelineEvent[]): ClubFinancialTimelineEvent[] {
  const groups = new Map<string, ClubFinancialTimelineEvent[]>();
  const tenMinutesMs = 10 * 60 * 1000;
  events.forEach((event) => {
    if (!Number.isFinite(event.dateMs)) return;
    const date = new Date(event.dateMs);
    const day = date.toISOString().slice(0, 10);
    const bucket = Math.floor(event.dateMs / tenMinutesMs);
    const key = `${event.kind}-${day}-${bucket}`;
    const current = groups.get(key) || [];
    current.push(event);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((items) => {
      const sorted = items.slice().sort((a, b) => b.dateMs - a.dateMs);
      const first = sorted[0];
      if (!first || sorted.length <= 1) return first;
      const amounts = sorted
        .map((item) => item.amountEur)
        .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
      const total = amounts.length ? amounts.reduce((sum, value) => sum + value, 0) : null;
      const signedTotal = total === null ? null : first.kind === "buy" ? -total : total;
      const title = first.kind === "reward"
        ? `${sorted.length} récompenses Sorare`
        : first.kind === "sell"
          ? `${sorted.length} ventes Sorare`
          : `${sorted.length} achats Sorare`;
      return {
        ...first,
        id: `group-${first.kind}-${first.dateMs}-${sorted.length}`,
        title,
        detail: xsClubEvolutionFinancialEventDetailV1({ ...first, count: sorted.length }),
        value: signedTotal === null ? first.value : formatSignedPreciseEuroV1(signedTotal),
        positive: first.kind !== "buy",
        amountEur: total,
        count: sorted.length,
        members: sorted,
      };
    })
    .filter((event): event is ClubFinancialTimelineEvent => !!event)
    .sort((a, b) => b.dateMs - a.dateMs);
}

function xsClubEvolutionBuildFinancialEventsV1(
  transactions: ClubTransactionHistoryItem[],
  rewards: ClubRewardHistoryItem[]
): ClubFinancialTimelineEvent[] {
  const transactionItems: ClubFinancialTimelineEvent[] = transactions.flatMap((item, index) => {
    const date = xsClubEvolutionDateFromStringV1(item.transactionDate);
    if (!date) return [];
    const isSell = item.transactionType === "sell";
    return [{
      id: `transaction-${item.id || item.cardSlug || index}`,
      kind: isSell ? "sell" as const : "buy" as const,
      date: date.toISOString(),
      dateMs: date.getTime(),
      title: transactionEventTitleV1(item),
      value: transactionEventValueV1(item),
      detail: isSell ? "Vente Sorare" : "Achat Sorare",
      positive: isSell,
      amountEur: item.amountEur,
    }];
  });

  const rewardItems: ClubFinancialTimelineEvent[] = rewards.flatMap((item, index) => {
    const date = xsClubEvolutionDateFromStringV1(item.createdAt);
    if (!date) return [];
    return [{
      id: `reward-${item.id || item.gameWeekLabel || index}`,
      kind: "reward" as const,
      date: date.toISOString(),
      dateMs: date.getTime(),
      title: rewardEventTitleV1(item),
      value: rewardEventValueV1(item),
      detail: item.competition || item.division || "Récompense Sorare",
      positive: true,
      amountEur: item.rewardTotalEur,
    }];
  });

  return transactionItems
    .concat(rewardItems)
    .sort((a, b) => b.dateMs - a.dateMs);
}

export default function ClubEvolutionScreen() {
  const [history, setHistory] = useState<ClubValueHistorySnapshot[]>([]);
  const [rewardEvents, setRewardEvents] = useState<ClubRewardHistoryItem[]>([]);
  const [transactionEvents, setTransactionEvents] = useState<ClubTransactionHistoryItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ClubEvolutionPeriodKey>("all");
  const [selectedSnapshot, setSelectedSnapshot] = useState<ClubValueHistorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const deviceId = await readDeviceIdV1();
      const rewards = await readRewardEventsV1(deviceId).catch(() => []);
      const transactions = await readTransactionEventsV1(deviceId).catch(() => []);
      let next = await readBackendHistoryV1(deviceId);
      if (!next.length) {
        await createBackendSnapshotV1(deviceId);
        next = await readBackendHistoryV1(deviceId);
      }
      setRewardEvents(rewards);
      setTransactionEvents(transactions);
      setHistory(next.length ? next : await upsertCurrentSnapshotV1());
    } catch {
      setRewardEvents([]);
      setTransactionEvents([]);
      setHistory(await readHistoryV1());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const financialTimelineEvents = useMemo(
    () => xsClubEvolutionBuildFinancialEventsV1(transactionEvents, rewardEvents),
    [rewardEvents, transactionEvents]
  );
  const completeValueHistory = useMemo(
    () => xsClubEvolutionCompleteValueHistoryV1(history),
    [history]
  );
  const incompleteInitializationCount = useMemo(
    () => xsClubEvolutionIncompleteInitializationCountV1(history, completeValueHistory),
    [completeValueHistory, history]
  );
  const firstCompleteSnapshot = completeValueHistory[0] || null;
  const firstCompleteDateLabel = firstCompleteSnapshot ? xsClubEvolutionFullDateLabelV1(firstCompleteSnapshot) : null;
  const periodWindow = useMemo(
    () => xsClubEvolutionFilterHistoryByPeriodV1(completeValueHistory, selectedPeriod, financialTimelineEvents),
    [completeValueHistory, financialTimelineEvents, selectedPeriod]
  );
  const periodHistory = periodWindow.items;
  const periodFinancialEvents = useMemo(
    () => xsClubEvolutionFilterFinancialEventsByPeriodV1(financialTimelineEvents, completeValueHistory, selectedPeriod),
    [completeValueHistory, financialTimelineEvents, selectedPeriod]
  );
  const groupedPeriodFinancialEvents = useMemo(
    () => xsClubEvolutionGroupTimelineEventsV1(periodFinancialEvents),
    [periodFinancialEvents]
  );
  const defaultSelectedSnapshot = periodHistory[periodHistory.length - 1] || null;
  const defaultSelectedKey = defaultSelectedSnapshot ? xsClubEvolutionSnapshotKeyV1(defaultSelectedSnapshot) : "";

  useEffect(() => {
    setSelectedSnapshot(defaultSelectedSnapshot);
  }, [defaultSelectedKey, selectedPeriod]);

  const activeSelectedSnapshot = selectedSnapshot && periodHistory.some(
    (item) => xsClubEvolutionSnapshotKeyV1(item) === xsClubEvolutionSnapshotKeyV1(selectedSnapshot)
  )
    ? selectedSnapshot
    : defaultSelectedSnapshot;
  const activeSelectedKey = activeSelectedSnapshot ? xsClubEvolutionSnapshotKeyV1(activeSelectedSnapshot) : null;
  const selectedPointDelta = useMemo(
    () => xsClubEvolutionDeltaForSelectedPointV1(periodHistory, activeSelectedSnapshot),
    [activeSelectedSnapshot, periodHistory]
  );
  const selectedValueEvents = useMemo(
    () => xsClubEvolutionEventsForSelectedPointV1(periodHistory, activeSelectedSnapshot),
    [activeSelectedSnapshot, periodHistory]
  );

  const summary = useMemo(() => {
    const first = periodHistory[0] || null;
    const periodLast = periodHistory[periodHistory.length - 1] || null;
    const last = completeValueHistory[completeValueHistory.length - 1] || history[history.length - 1] || periodLast;
    const variation = first && periodLast ? periodLast.clubValueEur - first.clubValueEur : 0;
    const coverage = last?.coveragePct !== null && last?.coveragePct !== undefined
      ? Math.round(last.coveragePct)
      : last?.cardCount
        ? Math.round(((last.pricedCards || 0) / last.cardCount) * 100)
        : null;
    const remainingCards = last?.cardCount !== null && last?.cardCount !== undefined
      ? Math.max(0, last.cardCount - (last.pricedCards || 0))
      : null;
    return { first, last, periodLast, variation, coverage, remainingCards };
  }, [completeValueHistory, history, periodHistory]);

  const financeReport = useMemo(() => {
    const variationText = formatSignedEuro(summary.variation);
    const priced = summary.last?.pricedCards ?? 0;
    const coverageText = summary.coverage === null ? "indisponible" : `${summary.coverage}%`;
    const remainingText = summary.remainingCards === null ? "Les cartes restantes sont à analyser." : `${summary.remainingCards} carte(s) restent à analyser.`;
    return `La valeur du club a évolué de ${variationText} sur la période affichée. ${priced} carte(s) sont valorisées. La couverture marché atteint ${coverageText}. ${remainingText}`;
  }, [summary]);

  const topMovers = useMemo(() => {
    const best = summary.last?.bestCardSlug && summary.last.bestCardGainEur !== null && summary.last.bestCardGainEur !== undefined
      ? [{ slug: summary.last.bestCardSlug, gain: summary.last.bestCardGainEur }]
      : [];
    const worst = summary.last?.worstCardSlug && summary.last.worstCardGainEur !== null && summary.last.worstCardGainEur !== undefined
      ? [{ slug: summary.last.worstCardSlug, gain: summary.last.worstCardGainEur }]
      : [];
    return { best, worst };
  }, [summary.last]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Évolution du club</Text>
            <Text style={styles.subtitle}>Historique de la valeur du portefeuille Xiascor</Text>
          </View>
        </View>

        <LinearGradient colors={["#4A060E", "#16070B", "#08080B"]} style={styles.hero}>
          <Text style={styles.heroLabel}>Valeur actuelle</Text>
          <Text style={styles.heroValue}>{summary.last?.clubValueText || formatEuro(summary.last?.clubValueEur ?? null)}</Text>
          <Text style={[styles.heroDelta, summary.variation >= 0 ? styles.positive : styles.negative]}>
            {formatSignedEuro(summary.variation)} sur la période affichée
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Évolution de la valeur</Text>
            <Text style={styles.cardAction}>Historique par date</Text>
          </View>
          <View style={styles.periodTabs}>
            {XS_CLUB_EVOLUTION_PERIODS_V1.map((period) => {
              const isActive = selectedPeriod === period.key;
              return (
                <Pressable
                  key={period.key}
                  accessibilityRole="button"
                  onPress={() => setSelectedPeriod(period.key)}
                  style={({ pressed }) => [styles.periodButton, isActive && styles.periodButtonActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.periodButtonText, isActive && styles.periodButtonTextActive]}>{period.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#FF3148" />
              <Text style={styles.muted}>{"Chargement de l'historique..."}</Text>
            </View>
          ) : periodHistory.length ? (
            <>
              <ChartLine
                history={periodHistory}
                financialEvents={groupedPeriodFinancialEvents}
                selectedKey={activeSelectedKey}
                onSelect={setSelectedSnapshot}
              />
              {periodWindow.fallbackUsed ? (
                <Text style={styles.chartHint}>{"Pas encore assez d'historique sur cette période. Dernier point connu affiché."}</Text>
              ) : periodWindow.sameAsFullRange && selectedPeriod !== "all" ? (
                <Text style={styles.chartHint}>
                  {firstCompleteDateLabel
                    ? `L'historique financier complet disponible commence le ${firstCompleteDateLabel}.`
                    : `Seulement ${periodHistory.length} snapshot(s) financier(s) complet(s) sont disponibles sur cette période.`}
                </Text>
              ) : periodHistory.length === 1 ? (
                <Text style={styles.chartHint}>Un seul snapshot financier complet est disponible sur cette période.</Text>
              ) : completeValueHistory.length === 1 ? (
                <Text style={styles.chartHint}>{"L'historique commence aujourd'hui. La courbe gagnera en précision après plusieurs snapshots."}</Text>
              ) : null}
              {incompleteInitializationCount > 0 ? (
                <Text style={styles.chartHint}>{"Les premiers snapshots correspondent à l'initialisation de la couverture marché et sont exclus de la performance."}</Text>
              ) : null}
              <Text style={styles.chartHint}>Valeur marché : snapshots Xiascor. Achats/ventes/rewards : historique Sorare disponible.</Text>
              <View style={styles.financialTimelineBox}>
                <View style={styles.financialTimelineHeader}>
                  <Text style={styles.financialTimelineTitle}>Timeline Sorare</Text>
                  <Text style={styles.financialTimelineCount}>{periodFinancialEvents.length} événement(s)</Text>
                </View>
                {groupedPeriodFinancialEvents.length ? (
                  groupedPeriodFinancialEvents.slice(0, 6).map((event) => (
                    <View key={`chart-event-${event.id}`} style={styles.financialTimelineRow}>
                      <View style={[
                        styles.financialTimelineIcon,
                        event.kind === "buy" ? styles.financialDotBuy : event.kind === "sell" ? styles.financialDotSell : styles.financialDotReward,
                      ]}>
                        <Ionicons
                          name={event.kind === "buy" ? "arrow-down" : event.kind === "sell" ? "arrow-up" : "trophy"}
                          size={12}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.financialTimelineBody}>
                        <Text style={styles.financialTimelineDate}>{xsClubEvolutionTimelineDateLabelV1(event.date)}</Text>
                        <Text style={styles.financialTimelineName} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.muted}>{xsClubEvolutionFinancialEventDetailV1(event)}</Text>
                      </View>
                      <Text style={event.positive ? styles.positive : styles.negative}>{event.value}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>Aucun achat, vente ou reward Sorare sur cette période.</Text>
                )}
              </View>
              {activeSelectedSnapshot ? (
                <View style={styles.selectedPointCard}>
                  <View style={styles.selectedPointLeft}>
                    <Text style={styles.selectedPointEyebrow}>Point sélectionné</Text>
                    <Text style={styles.selectedPointDate}>{xsClubEvolutionDateTimeLabelV1(activeSelectedSnapshot)}</Text>
                    <Text style={styles.selectedPointSource}>{xsClubEvolutionSourceLabelV1(activeSelectedSnapshot.source)}</Text>
                  </View>
                  <View style={styles.selectedPointRight}>
                    <Text style={styles.selectedPointValue}>{activeSelectedSnapshot.clubValueText || formatEuro(activeSelectedSnapshot.clubValueEur)}</Text>
                    <Text style={[styles.selectedPointDelta, selectedPointDelta === null || selectedPointDelta >= 0 ? styles.positive : styles.negative]}>
                      {selectedPointDelta === null ? "Premier point de l'historique financier" : `${formatSignedEuro(selectedPointDelta)} depuis le point précédent`}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : periodWindow.noSnapshotsInRange && periodFinancialEvents.length ? (
            <View style={styles.loadingBox}>
              <Text style={styles.mutedCenter}>Aucun snapshot financier complet sur cette période. Événements Sorare disponibles ci-dessous.</Text>
              <Text style={styles.chartHint}>Valeur marché : snapshots Xiascor. Achats/ventes/rewards : historique Sorare disponible.</Text>
            </View>
          ) : (
            <View style={styles.loadingBox}>
              <Text style={styles.muted}>Aucun historique financier complet disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Événements associés</Text>
            <Ionicons name="pin" size={18} color="#FF3148" />
          </View>
          {selectedValueEvents.length ? (
            selectedValueEvents.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={[styles.eventMarker, event.deltaValue >= 0 ? styles.eventMarkerPositive : styles.eventMarkerNegative]} />
                <View style={styles.eventBody}>
                  <View style={styles.eventTopLine}>
                    <Text style={styles.eventDate}>{event.dateLabel}</Text>
                    <Text style={[styles.eventDelta, event.deltaValue >= 0 ? styles.positive : styles.negative]}>{event.deltaText}</Text>
                  </View>
                  {event.descriptions.map((description) => (
                    <Text key={`${event.id}-${description}`} style={styles.eventText}>{description}</Text>
                  ))}
                  {event.note ? <Text style={styles.eventNote}>{event.note}</Text> : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Aucun événement de valeur déductible pour ce point.</Text>
          )}
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.clubValueText || "—"}</Text><Text style={styles.kpiLabel}>Valeur actuelle</Text></View>
          <View style={styles.kpi}><Text style={[styles.kpiValue, summary.variation >= 0 ? styles.positive : styles.negative]}>{formatSignedEuro(summary.variation)}</Text><Text style={styles.kpiLabel}>Variation totale</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.estimatedProfitPct === null || summary.last?.estimatedProfitPct === undefined ? "À connecter" : `${Math.round(summary.last.estimatedProfitPct)}%`}</Text><Text style={styles.kpiLabel}>ROI</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.coverage === null ? "—" : `${summary.coverage}%`}</Text><Text style={styles.kpiLabel}>Couverture marché</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{summary.last?.pricedCards ?? "—"} / {summary.last?.cardCount ?? "—"}</Text><Text style={styles.kpiLabel}>Cartes valorisées</Text></View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rapport du Directeur Financier</Text>
            <Ionicons name="analytics" size={18} color="#FF3148" />
          </View>
          <Text style={styles.reportText}>{financeReport}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Historique</Text>
          {history.map((item, index) => {
            const previous = index > 0 ? history[index - 1].clubValueEur : item.clubValueEur;
            const diff = item.clubValueEur - previous;
            const secondaryLabel = xsClubEvolutionSecondaryLabelV1(item);
            return (
              <View key={`${item.id}-row-${index}`} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyLabel}>{xsClubEvolutionDateLabelV1(item, true)}</Text>
                  {secondaryLabel ? <Text style={styles.muted}>{secondaryLabel}</Text> : null}
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyValue}>{item.clubValueText || formatEuro(item.clubValueEur)}</Text>
                  {index > 0 ? <Text style={diff >= 0 ? styles.positive : styles.negative}>{formatSignedEuro(diff)}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Événements financiers</Text>
            <Ionicons name="trophy" size={18} color="#FF3148" />
          </View>
          {groupedPeriodFinancialEvents.length ? (
            groupedPeriodFinancialEvents.slice(0, 12).map((event) => (
              <View key={`financial-row-${event.id}`} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyLabel}>{event.title}</Text>
                  <Text style={styles.muted}>{xsClubEvolutionTimelineDateLabelV1(event.date)} · {xsClubEvolutionFinancialEventDetailV1(event)}</Text>
                </View>
                <Text style={event.positive ? styles.positive : styles.negative}>{event.value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Aucun événement financier connecté sur cette période.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top progressions</Text>
          {topMovers.best.length ? (
            topMovers.best.map((item) => (
              <View key={`best-${item.slug}`} style={styles.historyRow}>
                <Text style={styles.historyLabel}>{formatSlugLabel(item.slug)}</Text>
                <Text style={styles.positive}>{formatSignedEuro(item.gain)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Top hausses à connecter</Text>
          )}
          <View style={styles.separator} />
          <Text style={styles.cardSubTitle}>Top baisses</Text>
          {topMovers.worst.length ? (
            topMovers.worst.map((item) => (
              <View key={`worst-${item.slug}`} style={styles.historyRow}>
                <Text style={styles.historyLabel}>{formatSlugLabel(item.slug)}</Text>
                <Text style={styles.negative}>{formatSignedEuro(item.gain)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Top baisses à connecter</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance nette</Text>
          <View style={styles.historyRow}><Text style={styles.muted}>Dépenses</Text><Text style={styles.historyValue}>{summary.last?.totalInvestedEur === null || summary.last?.totalInvestedEur === undefined ? "À connecter" : formatEuro(summary.last.totalInvestedEur)}</Text></View>
          <View style={styles.historyRow}><Text style={styles.muted}>Reventes</Text><Text style={styles.historyValue}>{summary.last?.totalSoldEur === null || summary.last?.totalSoldEur === undefined ? "À connecter" : formatEuro(summary.last.totalSoldEur)}</Text></View>
          <View style={styles.historyRow}><Text style={styles.muted}>Profit net</Text><Text style={styles.historyValue}>{summary.last?.estimatedProfitEur === null || summary.last?.estimatedProfitEur === undefined ? "À connecter" : formatSignedEuro(summary.last.estimatedProfitEur)}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050507" },
  content: { padding: 18, paddingBottom: 34, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  headerText: { flex: 1 },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.68)", fontSize: 14, marginTop: 3 },
  hero: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,49,72,0.55)", padding: 18, gap: 6 },
  heroLabel: { color: "rgba(255,255,255,0.64)", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  heroValue: { color: "#FFFFFF", fontSize: 44, fontWeight: "900" },
  heroDelta: { fontSize: 16, fontWeight: "900" },
  card: { borderRadius: 18, padding: 14, gap: 14, backgroundColor: "rgba(13,14,18,0.96)", borderWidth: 1, borderColor: "rgba(255,49,72,0.26)" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  cardSubTitle: { color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  cardAction: { color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "800" },
  periodTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  periodButton: { minWidth: 48, alignItems: "center", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  periodButtonActive: { backgroundColor: "rgba(255,49,72,0.18)", borderColor: "rgba(255,49,72,0.72)" },
  periodButtonText: { color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: "900" },
  periodButtonTextActive: { color: "#FFFFFF" },
  reportText: { color: "rgba(255,255,255,0.78)", fontSize: 14, fontWeight: "700", lineHeight: 21 },
  chart: { minHeight: 338, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(5,6,9,0.92)", borderWidth: 1, borderColor: "rgba(255,49,72,0.18)" },
  chartBackdrop: { ...StyleSheet.absoluteFillObject },
  chartGrid: { ...StyleSheet.absoluteFillObject, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.045)" },
  lineHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: 16, paddingBottom: 4 },
  chartValueLarge: { color: "#FFFFFF", fontSize: 28, fontWeight: "900" },
  chartMetaPill: { alignItems: "flex-end", gap: 3, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  chartMetaText: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  chartMetaSubText: { color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: "800" },
  linePlotOuter: { width: "100%", paddingHorizontal: 16, paddingBottom: 14 },
  linePlot: { marginTop: 8, position: "relative", width: "100%", overflow: "hidden", borderRadius: 14, backgroundColor: "rgba(2,3,6,0.42)" },
  chartGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,49,72,0.025)", borderRadius: 14 },
  chartHorizontalLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.075)" },
  chartHorizontalLineSoft: { backgroundColor: "rgba(255,255,255,0.045)" },
  chartAreaColumn: { position: "absolute", borderTopLeftRadius: 999, borderTopRightRadius: 999, opacity: 0.92 },
  chartCurveSegment: { height: 2.8, borderRadius: 999, position: "absolute", shadowColor: "#FF3148", shadowOpacity: 0.54, shadowRadius: 8, elevation: 2 },
  chartGapSegment: { height: 0, position: "absolute", borderTopWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.28)" },
  chartGapMarker: { position: "absolute", bottom: 34, width: 44, minHeight: 18, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "rgba(8,8,12,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  chartGapText: { color: "rgba(255,255,255,0.52)", fontSize: 10, fontWeight: "900", letterSpacing: 0 },
  chartCursor: { position: "absolute", top: 24, bottom: 32, width: 1, backgroundColor: "rgba(255,255,255,0.34)" },
  chartAxisValue: { position: "absolute", right: 8, color: "rgba(255,255,255,0.56)", fontSize: 10, fontWeight: "900", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(5,6,9,0.70)", overflow: "hidden" },
  chartAxisValueMuted: { color: "rgba(255,255,255,0.32)" },
  lineSegment: { height: 3, borderRadius: 999, position: "absolute" },
  linePoint: { width: 8, height: 8, borderRadius: 4, position: "absolute", backgroundColor: "#FF3148", borderWidth: 1.5, borderColor: "#140407", shadowColor: "#FF3148", shadowOpacity: 0.22, shadowRadius: 4, elevation: 2 },
  linePointSelected: { backgroundColor: "#FFFFFF", borderColor: "#FF3148", transform: [{ scale: 1.72 }], shadowOpacity: 0.82, shadowRadius: 10, elevation: 4 },
  financialDot: { width: 6, height: 6, borderRadius: 3, position: "absolute", borderWidth: 1, borderColor: "rgba(255,255,255,0.86)", shadowColor: "#000000", shadowOpacity: 0.24, shadowRadius: 3, elevation: 2 },
  financialDotBuy: { backgroundColor: "#FF4D61" },
  financialDotSell: { backgroundColor: "#2FE66B" },
  financialDotReward: { backgroundColor: "#F7B733" },
  lineLabels: { position: "relative", marginTop: 4 },
  chartAxisLabel: { position: "absolute", width: 80, textAlign: "center" },
  chartRows: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12 },
  chartColumn: { flex: 1, alignItems: "center", gap: 6, minWidth: 54 },
  chartValue: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "800" },
  barTrack: { height: 140, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "72%", borderRadius: 8 },
  chartLabel: { color: "rgba(255,255,255,0.52)", fontSize: 10, fontWeight: "800" },
  chartHint: { color: "rgba(255,255,255,0.52)", fontSize: 12, fontWeight: "800", textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },
  financialTimelineBox: { borderRadius: 14, padding: 12, gap: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  financialTimelineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  financialTimelineTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  financialTimelineCount: { color: "rgba(255,255,255,0.54)", fontSize: 12, fontWeight: "800" },
  financialTimelineRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  financialTimelineIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  financialTimelineBody: { flex: 1, gap: 2 },
  financialTimelineDate: { color: "rgba(255,255,255,0.52)", fontSize: 11, fontWeight: "800" },
  financialTimelineName: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  selectedPointCard: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderRadius: 14, padding: 12, backgroundColor: "rgba(255,49,72,0.08)", borderWidth: 1, borderColor: "rgba(255,49,72,0.22)" },
  selectedPointLeft: { flex: 1, gap: 4 },
  selectedPointRight: { alignItems: "flex-end", justifyContent: "center", gap: 4, maxWidth: 150 },
  selectedPointEyebrow: { color: "rgba(255,255,255,0.48)", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  selectedPointDate: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  selectedPointSource: { color: "rgba(255,255,255,0.56)", fontSize: 12, fontWeight: "700" },
  selectedPointValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  selectedPointDelta: { fontSize: 12, fontWeight: "900", textAlign: "right" },
  loadingBox: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "rgba(255,255,255,0.58)", fontSize: 13, fontWeight: "700" },
  mutedCenter: { color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "48%", borderRadius: 14, padding: 12, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  kpiValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  kpiLabel: { color: "rgba(255,255,255,0.56)", fontSize: 12, fontWeight: "700", marginTop: 4 },
  eventRow: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  eventMarker: { width: 8, borderRadius: 8, marginTop: 3, marginBottom: 3 },
  eventMarkerPositive: { backgroundColor: "rgba(47,230,107,0.86)" },
  eventMarkerNegative: { backgroundColor: "rgba(255,77,97,0.86)" },
  eventBody: { flex: 1, gap: 5 },
  eventTopLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eventDate: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  eventDelta: { fontSize: 14, fontWeight: "900" },
  eventText: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "800", lineHeight: 18 },
  eventNote: { color: "rgba(255,255,255,0.48)", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  historyLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  historyRight: { alignItems: "flex-end" },
  historyValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  separator: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 2 },
  positive: { color: "#2FE66B" },
  negative: { color: "#FF4D61" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
