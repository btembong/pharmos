import { db } from '@/lib/db';
import { deliveryZones, cutoffRules, publicHolidays } from '@pharmaflow/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { addBusinessDays } from '@pharmaflow/utils';

export async function findZoneByZip(zipCode: string) {
  // Check each zone's zip_ranges to find a match
  const zones = await db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.isActive, true));

  for (const zone of zones) {
    if (zone.zipRanges) {
      for (const range of zone.zipRanges) {
        const [start, end] = range.split('-').map(Number);
        const zip = parseInt(zipCode.substring(0, 5));
        if (zip >= start && zip <= end) return zone;
      }
    }
  }

  // Fallback: check by state (first 1-2 digits of ZIP map roughly to states)
  // For now return the national zone as fallback
  return zones.find((z) => z.type === 'national') ?? null;
}

export async function findZoneByState(state: string) {
  const zones = await db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.isActive, true));

  for (const zone of zones) {
    if (zone.states?.includes(state)) return zone;
  }

  return zones.find((z) => z.type === 'national') ?? null;
}

export async function calculateDeliveryEstimate(zoneId: string) {
  const zone = await db.query.deliveryZones.findFirst({
    where: eq(deliveryZones.id, zoneId),
  });
  if (!zone) return null;

  const cutoff = await db.query.cutoffRules.findFirst({
    where: eq(cutoffRules.isActive, true),
  });

  const holidays = await db
    .select()
    .from(publicHolidays)
    .where(eq(publicHolidays.country, 'US'));

  const holidayDates = holidays.map((h) => new Date(h.date));
  const now = new Date();
  const cutoffHour = cutoff?.cutoffHour ?? 14;

  // Determine if order is before cutoff
  const estHour = now.getUTCHours() - 5; // Rough ET conversion
  const isBeforeCutoff = estHour < cutoffHour;
  const dispatchDate = isBeforeCutoff
    ? now
    : addBusinessDays(now, 1, holidayDates);

  const standardEarliest = addBusinessDays(dispatchDate, zone.standardDaysMin, holidayDates);
  const standardLatest = addBusinessDays(dispatchDate, zone.standardDaysMax, holidayDates);

  const result: Record<string, unknown> = {
    standard: {
      earliest: standardEarliest.toISOString().split('T')[0],
      latest: standardLatest.toISOString().split('T')[0],
      fee: Number(zone.standardFee),
      freeAbove: zone.freeDeliveryAbove ? Number(zone.freeDeliveryAbove) : null,
    },
  };

  if (zone.expressDays && zone.expressFee) {
    const expressDate = addBusinessDays(dispatchDate, zone.expressDays, holidayDates);
    result.express = {
      earliest: expressDate.toISOString().split('T')[0],
      latest: expressDate.toISOString().split('T')[0],
      fee: Number(zone.expressFee),
      available: true,
    };
  }

  result.pickup = {
    readyInHours: 2,
    fee: 0,
  };

  // Calculate time until cutoff
  if (isBeforeCutoff) {
    const minutesUntilCutoff = (cutoffHour - estHour) * 60 - now.getMinutes();
    const hours = Math.floor(minutesUntilCutoff / 60);
    const minutes = minutesUntilCutoff % 60;
    result.cutoffMessage = `Order within ${hours}h ${minutes}m for today's dispatch`;
  } else {
    result.cutoffMessage = 'Order now for next business day dispatch';
  }

  return result;
}

// --- Carrier Tracking URLs ---

const CARRIER_TRACKING_URLS: Record<string, string> = {
  usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}',
  ups: 'https://www.ups.com/track?tracknum={tracking}',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
  dhl: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}',
};

export function getTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const pattern = CARRIER_TRACKING_URLS[carrier.toLowerCase()];
  if (!pattern) return null;
  return pattern.replace('{tracking}', encodeURIComponent(trackingNumber));
}

export async function listDeliveryZones() {
  return db
    .select()
    .from(deliveryZones)
    .where(eq(deliveryZones.isActive, true));
}
